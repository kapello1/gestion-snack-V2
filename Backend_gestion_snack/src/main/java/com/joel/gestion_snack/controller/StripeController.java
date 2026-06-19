package com.joel.gestion_snack.controller;

import com.joel.gestion_snack.model.dto.OrderDTO;
import com.joel.gestion_snack.model.dto.OrderRequestDTO;
import com.joel.gestion_snack.model.dto.PaymentIntentRequestDTO;
import com.joel.gestion_snack.model.dto.PaymentIntentResponseDTO;
import com.joel.gestion_snack.model.dto.RefundRequestDTO;
import com.joel.gestion_snack.service.implementations.OrderServiceImpl;
import com.joel.gestion_snack.service.implementations.StripeService;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.model.Event;
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

    /**
     * Endpoint de réception des webhooks Stripe.
     *
     * <p><b>Sécurité :</b> chaque requête Stripe est signée avec {@code STRIPE_WEBHOOK_SECRET}.
     * La signature est vérifiée AVANT tout traitement — une requête avec signature invalide
     * reçoit immédiatement un {@code 400 Bad Request} sans exécuter aucune logique métier.</p>
     *
     * <p><b>Corps brut obligatoire :</b> le corps est reçu en {@code byte[]} (non parsé par Spring)
     * car la vérification de la signature porte sur les octets exacts envoyés par Stripe.
     * Toute sérialisation/désérialisation JSON invaliderait la signature HMAC-SHA256.</p>
     *
     * <p><b>Événements gérés :</b></p>
     * <ul>
     *   <li>{@code payment_intent.payment_failed} — paiement refusé par la banque → transaction FAILED</li>
     *   <li>{@code charge.refunded} — remboursement initié depuis le dashboard Stripe → transaction REFUNDED</li>
     * </ul>
     *
     * <p><b>Toujours répondre 200 :</b> Stripe réessaie la livraison pendant 72h si la réponse
     * n'est pas 2xx. On répond 200 même en cas d'erreur métier interne pour éviter une boucle
     * de réessais infinie sur des événements que l'on ne peut pas traiter.</p>
     *
     * <p><b>Configuration requise :</b> {@code STRIPE_WEBHOOK_SECRET=whsec_...} dans le fichier
     * {@code .env}. Cette clé se récupère dans le dashboard Stripe → Webhooks → signing secret.
     * L'URL à enregistrer dans Stripe est : {@code https://[votre-domaine]/api/stripe/webhook}</p>
     */
    @PostMapping(value = "/webhook", consumes = "application/json")
    public ResponseEntity<String> handleWebhook(
            @RequestBody byte[] rawPayload,
            @RequestHeader("Stripe-Signature") String sigHeader) {

        Event event;
        try {
            event = stripeService.constructWebhookEvent(rawPayload, sigHeader);
        } catch (SignatureVerificationException e) {
            log.warn("Webhook Stripe: signature invalide — requête rejetée ({})", e.getMessage());
            return ResponseEntity.badRequest().body("Signature Stripe invalide");
        } catch (Exception e) {
            log.error("Webhook Stripe: erreur construction événement — {}", e.getMessage());
            return ResponseEntity.badRequest().body("Erreur webhook");
        }

        log.info("Webhook Stripe reçu: type={} id={}", event.getType(), event.getId());

        try {
            switch (event.getType()) {
                case "payment_intent.payment_failed" -> stripeService.handlePaymentFailed(event);
                case "charge.refunded"               -> stripeService.handleChargeRefunded(event);
                default -> log.debug("Webhook Stripe: événement ignoré — {}", event.getType());
            }
        } catch (Exception e) {
            // On log sans propager : répondre 200 pour éviter les réessais Stripe infinis
            log.error("Webhook Stripe: erreur traitement {} — {}", event.getType(), e.getMessage());
        }

        return ResponseEntity.ok("OK");
    }
}
