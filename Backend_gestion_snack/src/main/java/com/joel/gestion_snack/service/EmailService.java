package com.joel.gestion_snack.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class EmailService {

    private final WebClient brevoClient;

    @Value("${brevo.api-key:}")
    private String brevoApiKey;

    @Value("${brevo.from-email:gestionsnack.contact@gmail.com}")
    private String brevoFromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public EmailService(WebClient.Builder webClientBuilder) {
        this.brevoClient = webClientBuilder.baseUrl("https://api.brevo.com").build();
    }

    @PostConstruct
    private void logMailConfigStatus() {
        if (brevoApiKey != null && !brevoApiKey.isBlank()) {
            log.info("=== Email via Brevo API - from='{}' | frontend='{}' ===", brevoFromEmail, frontendUrl);
        } else {
            log.warn("=== EMAIL NON CONFIGURÉ - définissez BREVO_API_KEY dans les variables d'environnement ===");
        }
    }

    public boolean isConfigured() {
        return brevoApiKey != null && !brevoApiKey.isBlank();
    }

    public String getFromEmail() {
        return brevoFromEmail;
    }

    public boolean sendVerificationEmail(String toEmail, String token, String firstName) {
        if (!isConfigured()) {
            log.warn("Brevo non configuré - vérification non envoyée à {}", toEmail);
            return false;
        }
        String link = frontendUrl + "/verify-email?token=" + token;
        return sendHtml(toEmail, "Confirmez votre compte - Snack", buildVerificationBody(firstName, link));
    }

    public boolean sendPasswordResetEmail(String toEmail, String token, String firstName) {
        if (!isConfigured()) {
            log.warn("Brevo non configuré - réinitialisation non envoyée à {}", toEmail);
            return false;
        }
        String link = frontendUrl + "/reset-password?token=" + token;
        return sendHtml(toEmail, "Réinitialisation de votre mot de passe - Snack", buildResetBody(firstName, link));
    }

    public boolean send2FACodeEmail(String toEmail, String code, String firstName) {
        if (!isConfigured()) {
            log.warn("Brevo non configuré - code 2FA non envoyé à {}", toEmail);
            return false;
        }
        return sendHtml(toEmail, "Votre code de vérification - Snack", build2FABody(firstName, code));
    }

    public boolean sendTestEmail(String toEmail) {
        if (!isConfigured()) {
            log.warn("Brevo non configuré - test impossible");
            return false;
        }
        String body = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
                + "<h1 style='color:#2563eb'>Snack</h1>"
                + "<h2>Test de configuration email</h2>"
                + "<p>Si vous recevez cet email, la configuration Brevo fonctionne correctement.</p>"
                + "<p><strong>Provider :</strong> Brevo API</p>"
                + "<p style='color:#6b7280;font-size:12px'>Envoyé depuis : " + brevoFromEmail + "</p>"
                + "</div>";
        return sendHtml(toEmail, "Test de configuration email - Snack", body);
    }

    private boolean sendHtml(String to, String subject, String htmlBody) {
        try {
            Map<String, Object> sender = new HashMap<>();
            sender.put("name", "Snack");
            sender.put("email", brevoFromEmail);

            Map<String, Object> recipient = new HashMap<>();
            recipient.put("email", to);

            Map<String, Object> payload = new HashMap<>();
            payload.put("sender", sender);
            payload.put("to", List.of(recipient));
            payload.put("subject", subject);
            payload.put("htmlContent", htmlBody);

            String response = brevoClient.post()
                    .uri("/v3/smtp/email")
                    .header("api-key", brevoApiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("Email envoyé via Brevo à {} - réponse: {}", to, response);
            return true;
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) root = root.getCause();
            log.error("Échec envoi Brevo à {} - [{}] {} | cause: [{}] {}",
                    to, e.getClass().getSimpleName(), e.getMessage(),
                    root.getClass().getSimpleName(), root.getMessage());
            return false;
        }
    }

    public boolean sendReservationConfirmationEmail(
            String toEmail,
            String customerName,
            String phoneNumber,
            int tableCapacity,
            int numberOfPersons,
            String reservationDate,
            String reservationTime,
            String tableNumber) {
        if (!isConfigured()) {
            log.warn("Brevo non configuré - confirmation de réservation non envoyée à {}", toEmail);
            return false;
        }
        String body = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
                + "<h1 style='color:#2563eb'>Snack</h1>"
                + "<h2 style='color:#1f2937'>Confirmation de réservation</h2>"
                + "<p style='color:#4b5563'>Bonjour <strong>" + customerName + "</strong>,</p>"
                + "<p style='color:#4b5563'>Votre réservation a bien été enregistrée. Voici le récapitulatif :</p>"
                + "<table style='width:100%;border-collapse:collapse;margin:24px 0'>"
                + "<tr style='background:#f3f4f6'>"
                + "<td style='padding:10px 14px;font-weight:bold;color:#374151;width:45%'>Client</td>"
                + "<td style='padding:10px 14px;color:#1f2937'>" + customerName + "</td></tr>"
                + "<tr>"
                + "<td style='padding:10px 14px;font-weight:bold;color:#374151'>Téléphone</td>"
                + "<td style='padding:10px 14px;color:#1f2937'>" + phoneNumber + "</td></tr>"
                + "<tr style='background:#f3f4f6'>"
                + "<td style='padding:10px 14px;font-weight:bold;color:#374151'>Table n°</td>"
                + "<td style='padding:10px 14px;color:#1f2937'>" + tableNumber + " (capacité : " + tableCapacity + " places)</td></tr>"
                + "<tr>"
                + "<td style='padding:10px 14px;font-weight:bold;color:#374151'>Nombre de personnes</td>"
                + "<td style='padding:10px 14px;color:#1f2937'>" + numberOfPersons + "</td></tr>"
                + "<tr style='background:#f3f4f6'>"
                + "<td style='padding:10px 14px;font-weight:bold;color:#374151'>Date</td>"
                + "<td style='padding:10px 14px;color:#1f2937'>" + reservationDate + "</td></tr>"
                + "<tr>"
                + "<td style='padding:10px 14px;font-weight:bold;color:#374151'>Heure</td>"
                + "<td style='padding:10px 14px;color:#1f2937'>" + reservationTime + "</td></tr>"
                + "</table>"
                + "<p style='color:#4b5563'>Nous vous attendons avec plaisir. "
                + "En cas d'empêchement, pensez à annuler votre réservation.</p>"
                + "<div style='text-align:center;margin:32px 0'>"
                + "<a href='" + frontendUrl + "' style='display:inline-block;padding:12px 28px;background:#2563eb;"
                + "color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px'>"
                + "Voir le site</a></div>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0'>"
                + "<p style='color:#9ca3af;font-size:12px'>Snack - cet email est automatique, merci de ne pas y répondre.</p>"
                + "</div>";
        return sendHtml(toEmail, "Confirmation de votre réservation - Snack", body);
    }

    private String build2FABody(String firstName, String code) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
                + "<h1 style='color:#2563eb'>Snack</h1>"
                + "<h2 style='color:#1f2937'>Vérification en deux étapes</h2>"
                + "<p style='color:#4b5563;font-size:16px'>Bonjour " + firstName + ",</p>"
                + "<p style='color:#4b5563;font-size:16px'>Voici votre code de vérification :</p>"
                + "<div style='text-align:center;margin:32px 0'>"
                + "<div style='display:inline-block;padding:20px 40px;background:#f3f4f6;"
                + "border-radius:12px;border:2px solid #e0e7ff'>"
                + "<span style='font-size:36px;font-weight:900;letter-spacing:12px;color:#4f46e5'>"
                + code + "</span></div></div>"
                + "<p style='color:#6b7280;font-size:14px'>Ce code expire dans <strong>10 minutes</strong>.</p>"
                + "<p style='color:#6b7280;font-size:14px'>Si vous n'êtes pas à l'origine de cette connexion, "
                + "ignorez cet email et sécurisez votre compte.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0'>"
                + "<p style='color:#9ca3af;font-size:12px'>Snack - cet email est automatique, merci de ne pas y répondre.</p>"
                + "</div>";
    }

    private String buildVerificationBody(String firstName, String link) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
                + "<h1 style='color:#2563eb'>Snack</h1>"
                + "<h2 style='color:#1f2937'>Bienvenue, " + firstName + " !</h2>"
                + "<p style='color:#4b5563;font-size:16px'>Merci de vous être inscrit. "
                + "Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>"
                + "<div style='text-align:center;margin:32px 0'>"
                + "<a href='" + link + "' style='display:inline-block;padding:14px 32px;background:#2563eb;"
                + "color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px'>"
                + "Confirmer mon compte</a></div>"
                + "<p style='color:#6b7280;font-size:14px'>Ce lien expire dans <strong>24 heures</strong>.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0'>"
                + "<p style='color:#9ca3af;font-size:12px'>Si vous n'êtes pas à l'origine de cette inscription, "
                + "ignorez cet email.</p></div>";
    }

    private String buildResetBody(String firstName, String link) {
        return "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
                + "<h1 style='color:#2563eb'>Snack</h1>"
                + "<h2 style='color:#1f2937'>Réinitialisation du mot de passe</h2>"
                + "<p style='color:#4b5563;font-size:16px'>Bonjour " + firstName + ",</p>"
                + "<p style='color:#4b5563;font-size:16px'>"
                + "Vous avez demandé la réinitialisation de votre mot de passe.</p>"
                + "<div style='text-align:center;margin:32px 0'>"
                + "<a href='" + link + "' style='display:inline-block;padding:14px 32px;background:#2563eb;"
                + "color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px'>"
                + "Réinitialiser mon mot de passe</a></div>"
                + "<p style='color:#6b7280;font-size:14px'>Ce lien expire dans <strong>1 heure</strong>.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0'>"
                + "<p style='color:#9ca3af;font-size:12px'>Si vous n'avez pas demandé cette réinitialisation, "
                + "ignorez cet email.</p></div>";
    }
}
