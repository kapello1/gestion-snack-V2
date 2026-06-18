package com.joel.gestion_snack.controller;

import com.joel.gestion_snack.model.dto.OrderDTO;
import com.joel.gestion_snack.model.dto.OrderRequestDTO;
import com.joel.gestion_snack.model.dto.PaymentIntentRequestDTO;
import com.joel.gestion_snack.model.dto.PaymentIntentResponseDTO;
import com.joel.gestion_snack.model.dto.RefundRequestDTO;
import com.joel.gestion_snack.service.implementations.OrderServiceImpl;
import com.joel.gestion_snack.service.implementations.StripeService;
import com.stripe.model.PaymentIntent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Contrôleur REST pour les opérations de paiement Stripe.
 *
 * <p><b>Flux de paiement en ligne (commande client) :</b></p>
 * <ol>
 *   <li>Le frontend appelle {@code POST /create-payment-intent} → reçoit un {@code clientSecret}</li>
 *   <li>Stripe.js affiche le formulaire de carte directement dans le navigateur (PCI DSS compliant)</li>
 *   <li>Stripe.js confirme le paiement côté client et retourne un {@code paymentIntentId}</li>
 *   <li>Le frontend appelle {@code POST /confirm-order} avec le {@code paymentIntentId}
 *       → le serveur vérifie le statut Stripe, puis crée la commande en BDD</li>
 * </ol>
 *
 * <p><b>Flux de remboursement :</b></p>
 * <ol>
 *   <li>L'admin appelle {@code POST /refund} avec l'ID de la commande</li>
 *   <li>Le serveur appelle Stripe pour créer le remboursement</li>
 *   <li>Si Stripe confirme → la transaction passe en REFUNDED et le CA est corrigé</li>
 *   <li>Si Stripe échoue → rien n'est modifié en BDD (cohérence garantie)</li>
 * </ol>
 *
 * <p><b>Sécurité :</b> la clé secrète Stripe ({@code STRIPE_SECRET_KEY}) n'est jamais
 * transmise au frontend. Toutes les opérations sensibles passent par ce contrôleur.</p>
 */
@RestController
@RequestMapping("/api/stripe")
@RequiredArgsConstructor
@Slf4j
public class StripeController {

    private final StripeService stripeService;
    private final OrderServiceImpl orderService;

    /**
     * Étape 1 du paiement en ligne : crée un PaymentIntent Stripe.
     *
     * <p>Le {@code clientSecret} retourné est un jeton temporaire à usage unique que
     * Stripe.js utilise côté navigateur pour afficher le formulaire de carte et confirmer
     * le paiement. Ce secret ne doit jamais être persisté ni loggué.</p>
     *
     * <p>Le montant est validé ici côté serveur pour éviter qu'un client malveillant
     * ne soumette un montant de 0 centime.</p>
     */
    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody PaymentIntentRequestDTO request) {
        if (!stripeService.isConfigured()) {
            log.error("Stripe non configuré - STRIPE_SECRET_KEY absent ou invalide");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Service de paiement non disponible - contactez l'administrateur"));
        }
        if (request.getAmountInCents() == null || request.getAmountInCents() <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Montant invalide"));
        }
        try {
            PaymentIntent pi = stripeService.createPaymentIntent(
                    request.getAmountInCents(),
                    request.getCurrency() != null ? request.getCurrency() : "eur"
            );
            log.info("PaymentIntent créé: {} ({})", pi.getId(), request.getAmountInCents() + " centimes");
            return ResponseEntity.ok(new PaymentIntentResponseDTO(pi.getClientSecret(), pi.getId()));
        } catch (Exception e) {
            log.error("Erreur création PaymentIntent: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Erreur lors de l'initialisation du paiement: " + e.getMessage()));
        }
    }

    /**
     * Étape 2 du paiement en ligne : vérifie le paiement Stripe puis crée la commande.
     *
     * <p>La vérification du statut Stripe est faite CÔTÉ SERVEUR (appel direct à l'API Stripe)
     * pour éviter toute falsification : un client ne peut pas prétendre avoir payé sans que
     * Stripe ne le confirme. La commande n'est créée en BDD qu'après cette confirmation.</p>
     *
     * <p>Si la commande est créée mais qu'une erreur survient ensuite, le paiement Stripe
     * reste valide côté Stripe. Dans ce cas, un remboursement manuel via le dashboard Stripe
     * ou l'endpoint {@code /refund} est nécessaire.</p>
     */
    @PostMapping("/confirm-order")
    public ResponseEntity<?> confirmAndCreateOrder(@RequestBody OrderRequestDTO request) {
        String piId = request.getStripePaymentIntentId();
        if (piId == null || piId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Identifiant de paiement manquant"));
        }
        if (!stripeService.isPaymentSucceeded(piId)) {
            log.warn("PaymentIntent {} non confirmé - commande refusée", piId);
            return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED)
                    .body(Map.of("message", "Le paiement n'a pas été confirmé par Stripe. Veuillez réessayer."));
        }
        try {
            OrderDTO order = orderService.createOrder(request);
            log.info("Commande {} créée après paiement Stripe {}", order.getOrderId(), piId);
            return ResponseEntity.status(HttpStatus.CREATED).body(order);
        } catch (Exception e) {
            log.error("Erreur création commande après paiement Stripe {}: {}", piId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * Rembourse intégralement une commande payée par Stripe.
     *
     * <p><b>Règle d'or :</b> Stripe est appelé EN PREMIER. La BDD n'est mise à jour
     * qu'après confirmation de Stripe. Si Stripe échoue, la transaction reste COMPLETED
     * et aucune donnée n'est corrompue.</p>
     *
     * <p>Codes HTTP retournés :</p>
     * <ul>
     *   <li>{@code 200 OK} — remboursement réussi, commande retournée avec transaction REFUNDED</li>
     *   <li>{@code 400 Bad Request} — paramètre manquant (orderId null)</li>
     *   <li>{@code 409 Conflict} — commande déjà remboursée, pas de PaymentIntent Stripe, etc.</li>
     *   <li>{@code 502 Bad Gateway} — Stripe a refusé le remboursement (délai, fonds, etc.)</li>
     *   <li>{@code 503 Service Unavailable} — Stripe non configuré sur ce serveur</li>
     * </ul>
     */
    @PostMapping("/refund")
    public ResponseEntity<?> refundOrder(@RequestBody RefundRequestDTO request) {
        if (request.getOrderId() == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "L'identifiant de la commande est requis"));
        }
        if (!stripeService.isConfigured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Service de paiement non disponible - contactez l'administrateur"));
        }
        try {
            OrderDTO order = orderService.refundOrder(request.getOrderId(), request.getRefundedBy());
            log.info("Commande {} remboursée par {}", request.getOrderId(), request.getRefundedBy());
            return ResponseEntity.ok(order);
        } catch (IllegalStateException e) {
            // Cas métier prévisibles : déjà remboursé, pas de paiement Stripe, etc.
            log.warn("Remboursement refusé pour commande {}: {}", request.getOrderId(), e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            // Échec Stripe (réseau, fonds insuffisants, délai dépassé, etc.)
            log.error("Erreur remboursement commande {}: {}", request.getOrderId(), e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Remboursement impossible: " + e.getMessage()));
        }
    }
}
