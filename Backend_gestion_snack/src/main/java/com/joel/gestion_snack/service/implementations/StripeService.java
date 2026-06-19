package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.entity.Transaction;
import com.joel.gestion_snack.model.entity.TransactionStatusType;
import com.joel.gestion_snack.repository.TransactionRepository;
import com.stripe.Stripe;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.StripeObject;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentCreateParams;
import com.stripe.param.RefundCreateParams;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Service de communication avec l'API Stripe.
 *
 * <p>Responsabilités :</p>
 * <ul>
 *   <li>Créer un PaymentIntent (initie un paiement côté Stripe, renvoie un clientSecret au frontend)</li>
 *   <li>Vérifier qu'un paiement est bien confirmé avant de valider une commande</li>
 *   <li>Créer un remboursement (Refund) sur un PaymentIntent existant</li>
 * </ul>
 *
 * <p><b>Configuration requise :</b> définir la variable d'environnement {@code STRIPE_SECRET_KEY}
 * dans le fichier {@code .env} à la racine du projet Backend. Sans cette clé, toutes les
 * opérations Stripe sont bloquées ({@code isConfigured()} retourne {@code false}).</p>
 *
 * <p><b>Mode test vs production :</b> Stripe distingue les clés par leur préfixe.
 * {@code sk_test_...} → mode test (aucun vrai débit). {@code sk_live_...} → mode production
 * (vrais débits bancaires). Ne jamais committer une clé live dans le code source.</p>
 */
@Service
@Slf4j
public class StripeService {

    /**
     * Clé secrète Stripe injectée depuis application.properties / variable d'environnement.
     * La valeur par défaut "" évite une NullPointerException au démarrage si la clé est absente.
     */
    @Value("${stripe.secret-key:}")
    private String secretKey;

    @Value("${stripe.webhook-secret:}")
    private String webhookSecret;

    @Autowired
    private TransactionRepository transactionRepository;

    /**
     * Initialise le SDK Stripe avec la clé secrète au démarrage de l'application.
     * Le préfixe "sk_test_VOTRE" correspond à la valeur placeholder du fichier .env.example :
     * si elle n'a pas été remplacée, Stripe n'est pas configuré et les paiements sont désactivés.
     */
    @PostConstruct
    public void init() {
        if (secretKey != null && !secretKey.isBlank() && !secretKey.startsWith("sk_test_VOTRE")) {
            Stripe.apiKey = secretKey;
            log.info("Stripe configuré (mode: {})", secretKey.startsWith("sk_live_") ? "LIVE" : "TEST");
        } else {
            log.warn("Stripe non configuré - définissez STRIPE_SECRET_KEY dans votre .env");
        }
    }

    /**
     * Crée un PaymentIntent Stripe pour un montant donné.
     *
     * <p>Le PaymentIntent représente une intention de paiement côté Stripe. Il retourne un
     * {@code clientSecret} que le frontend utilise avec Stripe.js pour afficher le formulaire
     * de carte et confirmer le paiement directement depuis le navigateur du client.
     * Le backend ne voit jamais les données bancaires brutes.</p>
     *
     * @param amountInCents montant en centimes (ex. 1500 = 15,00 €) — Stripe exige les centimes
     * @param currency      code ISO 4217 de la devise (ex. "eur", "usd")
     * @return le PaymentIntent Stripe contenant le clientSecret
     * @throws StripeException si l'API Stripe est inaccessible ou la clé invalide
     */
    public PaymentIntent createPaymentIntent(long amountInCents, String currency) throws StripeException {
        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency(currency != null ? currency : "eur")
                .addPaymentMethodType("card")
                .build();
        return PaymentIntent.create(params);
    }

    /**
     * Vérifie côté Stripe qu'un paiement est bien dans l'état "succeeded".
     *
     * <p>Cette vérification est faite CÔTÉ SERVEUR (et non côté frontend) pour éviter
     * qu'un client malveillant puisse créer une commande sans avoir réellement payé.
     * On interroge directement l'API Stripe pour connaître l'état réel du PaymentIntent.</p>
     *
     * @param paymentIntentId identifiant Stripe du PaymentIntent (commence par "pi_")
     * @return {@code true} uniquement si Stripe confirme l'état "succeeded"
     */
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

    /**
     * Crée un remboursement partiel ou total sur un PaymentIntent Stripe existant.
     *
     * <p><b>Important :</b> cette méthode lance une exception si Stripe refuse le remboursement
     * (délai dépassé, fonds insuffisants sur le compte Stripe, charge déjà remboursée, etc.).
     * L'appelant ({@link com.joel.gestion_snack.service.implementations.OrderServiceImpl#refundOrder})
     * ne met à jour la base de données QU'APRÈS le succès de cette méthode, garantissant
     * la cohérence entre Stripe et la BDD locale.</p>
     *
     * <p>Causes fréquentes d'échec Stripe :</p>
     * <ul>
     *   <li>{@code charge_already_refunded} — remboursement déjà effectué côté Stripe</li>
     *   <li>{@code charge_expired_for_capture} — PaymentIntent trop ancien (&gt; 180 jours)</li>
     *   <li>{@code insufficient_funds} — solde insuffisant sur le compte Stripe du marchand</li>
     * </ul>
     *
     * @param paymentIntentId identifiant Stripe du PaymentIntent (commence par "pi_")
     * @param amountInCents   montant à rembourser en centimes — doit correspondre au montant payé
     * @return l'objet Refund Stripe (contient l'ID du remboursement pour traçabilité)
     * @throws StripeException si Stripe refuse le remboursement
     */
    public Refund createRefund(String paymentIntentId, long amountInCents) throws StripeException {
        RefundCreateParams params = RefundCreateParams.builder()
                .setPaymentIntent(paymentIntentId)
                .setAmount(amountInCents)
                .build();
        Refund refund = Refund.create(params);
        log.info("Remboursement Stripe créé: {} pour PaymentIntent {}", refund.getId(), paymentIntentId);
        return refund;
    }

    /**
     * Construit et valide un événement Stripe reçu par webhook.
     *
     * <p>Stripe signe chaque requête webhook avec une clé HMAC-SHA256 ({@code whsec_...}).
     * La vérification de la signature garantit que la requête vient bien de Stripe et non
     * d'un attaquant qui simulerait un paiement réussi. Sans cette vérification, n'importe qui
     * pourrait appeler {@code /webhook} pour déclencher la création de commandes gratuitement.</p>
     *
     * <p>Le corps de la requête doit être passé en bytes bruts (non parsés par Spring)
     * car la signature couvre exactement les octets reçus. Toute transformation (reformatage JSON,
     * décodage UTF-8 puis ré-encodage) invaliderait la signature.</p>
     *
     * @param rawPayload  corps de la requête HTTP brut (bytes non modifiés)
     * @param sigHeader   valeur de l'en-tête {@code Stripe-Signature}
     * @return l'événement Stripe désérialisé et validé
     * @throws SignatureVerificationException si la signature est invalide ou absente
     * @throws IllegalStateException          si {@code STRIPE_WEBHOOK_SECRET} n'est pas configuré
     */
    public Event constructWebhookEvent(byte[] rawPayload, String sigHeader)
            throws SignatureVerificationException {
        if (webhookSecret == null || webhookSecret.isBlank()) {
            throw new IllegalStateException("STRIPE_WEBHOOK_SECRET non configuré");
        }
        return Webhook.constructEvent(
                new String(rawPayload, StandardCharsets.UTF_8), sigHeader, webhookSecret);
    }

    /**
     * Traite un événement {@code payment_intent.payment_failed} reçu de Stripe.
     *
     * <p>Stripe envoie cet événement quand un paiement est refusé définitivement par la banque
     * (après éventuels re-essais automatiques). On marque la transaction correspondante en FAILED
     * pour refléter l'état réel côté Stripe. Seules les transactions COMPLETED sont affectées
     * (une transaction déjà FAILED ou PENDING n'est pas modifiée à nouveau).</p>
     */
    @Transactional
    public void handlePaymentFailed(Event event) {
        Optional<StripeObject> optional = event.getDataObjectDeserializer().getObject();
        if (optional.isEmpty()) return;
        PaymentIntent pi = (PaymentIntent) optional.get();
        transactionRepository.findByStripePaymentIntentId(pi.getId()).ifPresent(tx -> {
            if (tx.getStatus() != TransactionStatusType.COMPLETED) return;
            tx.setStatus(TransactionStatusType.FAILED);
            tx.setUpdatedBy("STRIPE_WEBHOOK");
            transactionRepository.save(tx);
            log.warn("Webhook payment_intent.payment_failed: pi={} → transaction {} → FAILED",
                    pi.getId(), tx.getIdTransaction());
        });
    }

    /**
     * Traite un événement {@code charge.refunded} reçu de Stripe.
     *
     * <p>Cet événement arrive quand un remboursement est initié directement depuis le dashboard
     * Stripe (sans passer par notre endpoint {@code /refund}). On synchronise l'état en BDD
     * pour éviter une divergence entre Stripe et notre base. L'opération est idempotente :
     * si la transaction est déjà REFUNDED (remboursement via notre API), elle est ignorée.</p>
     */
    @Transactional
    public void handleChargeRefunded(Event event) {
        Optional<StripeObject> optional = event.getDataObjectDeserializer().getObject();
        if (optional.isEmpty()) return;
        Charge charge = (Charge) optional.get();
        String piId = charge.getPaymentIntent();
        if (piId == null || piId.isBlank()) return;

        transactionRepository.findByStripePaymentIntentId(piId).ifPresentOrElse(
            tx -> {
                if (tx.getStatus() == TransactionStatusType.REFUNDED) {
                    log.info("Webhook charge.refunded: pi={} déjà REFUNDED en BDD — ignoré", piId);
                    return;
                }
                tx.setStatus(TransactionStatusType.REFUNDED);
                tx.setUpdatedBy("STRIPE_WEBHOOK");
                transactionRepository.save(tx);
                log.info("Webhook charge.refunded: pi={} synchronisé → transaction {} REFUNDED",
                        piId, tx.getIdTransaction());
            },
            () -> log.warn("Webhook charge.refunded: pi={} → aucune transaction trouvée en BDD", piId)
        );
    }

    /**
     * Indique si Stripe est correctement configuré et utilisable.
     * Appelé avant chaque opération Stripe pour éviter des erreurs cryptiques côté API.
     *
     * @return {@code true} si la clé secrète est présente et semble valide
     */
    public boolean isConfigured() {
        return secretKey != null
                && !secretKey.isBlank()
                && !secretKey.startsWith("sk_test_VOTRE");
    }
}
