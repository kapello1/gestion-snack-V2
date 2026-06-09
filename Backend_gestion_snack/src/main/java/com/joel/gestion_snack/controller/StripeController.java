package com.joel.gestion_snack.controller;

import com.joel.gestion_snack.model.dto.OrderDTO;
import com.joel.gestion_snack.model.dto.OrderRequestDTO;
import com.joel.gestion_snack.model.dto.PaymentIntentRequestDTO;
import com.joel.gestion_snack.model.dto.PaymentIntentResponseDTO;
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
 * Endpoints Stripe : création du PaymentIntent + confirmation de commande après paiement.
 */
@RestController
@RequestMapping("/api/stripe")
@RequiredArgsConstructor
@Slf4j
public class StripeController {

    private final StripeService stripeService;
    private final OrderServiceImpl orderService;

    /**
     * Crée un PaymentIntent Stripe et retourne le clientSecret au frontend.
     * Le frontend utilise ce secret pour afficher le Stripe Payment Element.
     */
    @PostMapping("/create-payment-intent")
    public ResponseEntity<?> createPaymentIntent(@RequestBody PaymentIntentRequestDTO request) {
        if (!stripeService.isConfigured()) {
            log.error("Stripe non configuré — STRIPE_SECRET_KEY absent ou invalide");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("message", "Service de paiement non disponible — contactez l'administrateur"));
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
     * Vérifie que le paiement Stripe est bien confirmé (status = succeeded),
     * puis crée la commande avec une transaction COMPLETED.
     * Appelé par le frontend après que Stripe.js a confirmé le paiement.
     */
    @PostMapping("/confirm-order")
    public ResponseEntity<?> confirmAndCreateOrder(@RequestBody OrderRequestDTO request) {
        String piId = request.getStripePaymentIntentId();
        if (piId == null || piId.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Identifiant de paiement manquant"));
        }
        if (!stripeService.isPaymentSucceeded(piId)) {
            log.warn("PaymentIntent {} non confirmé — commande refusée", piId);
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
}
