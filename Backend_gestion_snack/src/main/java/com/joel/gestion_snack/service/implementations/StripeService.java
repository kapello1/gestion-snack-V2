package com.joel.gestion_snack.service.implementations;

import com.stripe.Stripe;
import com.stripe.exception.StripeException;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class StripeService {

    @Value("${stripe.secret-key:}")
    private String secretKey;

    @PostConstruct
    public void init() {
        if (secretKey != null && !secretKey.isBlank() && !secretKey.startsWith("sk_test_VOTRE")) {
            Stripe.apiKey = secretKey;
            log.info("Stripe configuré (mode: {})", secretKey.startsWith("sk_live_") ? "LIVE" : "TEST");
        } else {
            log.warn("Stripe non configuré — définissez STRIPE_SECRET_KEY dans votre .env");
        }
    }

    public PaymentIntent createPaymentIntent(long amountInCents, String currency) throws StripeException {
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency(currency != null ? currency : "eur")
                .addPaymentMethodType("card")
                .build();
        return PaymentIntent.create(params);
    }

    public boolean isPaymentSucceeded(String paymentIntentId) {
        if (paymentIntentId == null || paymentIntentId.isBlank()) return false;
        try {
            PaymentIntent pi = PaymentIntent.retrieve(paymentIntentId);
            return "succeeded".equals(pi.getStatus());
        } catch (StripeException e) {
            log.error("Erreur vérification PaymentIntent {}: {}", paymentIntentId, e.getMessage());
            return false;
        }
    }

    public boolean isConfigured() {
        return secretKey != null
                && !secretKey.isBlank()
                && !secretKey.startsWith("sk_test_VOTRE");
    }
}
