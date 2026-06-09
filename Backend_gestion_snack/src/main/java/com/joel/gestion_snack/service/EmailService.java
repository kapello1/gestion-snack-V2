package com.joel.gestion_snack.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service d'envoi d'email.
 * Priorité : Resend API (RESEND_API_KEY) → Gmail SMTP (MAIL_USERNAME + MAIL_PASSWORD).
 * Resend utilise HTTPS/443, jamais bloqué par les hébergeurs cloud.
 */
@Service
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;
    private final WebClient resendClient;

    @Value("${resend.api-key:}")
    private String resendApiKey;

    @Value("${resend.from:Snack <onboarding@resend.dev>}")
    private String resendFrom;

    @Value("${spring.mail.username:}")
    private String smtpFrom;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender, WebClient.Builder webClientBuilder) {
        this.mailSender = mailSender;
        this.resendClient = webClientBuilder.baseUrl("https://api.resend.com").build();
    }

    @PostConstruct
    private void logMailConfigStatus() {
        if (resendApiKey != null && !resendApiKey.isBlank()) {
            log.info("=== Email via Resend API — from='{}' | frontend='{}' ===", resendFrom, frontendUrl);
        } else if (smtpFrom != null && !smtpFrom.isBlank()) {
            log.info("=== Email via Gmail SMTP — from='{}' | frontend='{}' ===", smtpFrom, frontendUrl);
        } else {
            log.warn("=== EMAIL NON CONFIGURÉ — définissez RESEND_API_KEY (recommandé) ou MAIL_USERNAME+MAIL_PASSWORD ===");
        }
    }

    public boolean isConfigured() {
        return (resendApiKey != null && !resendApiKey.isBlank())
                || (smtpFrom != null && !smtpFrom.isBlank());
    }

    public String getFromEmail() {
        if (resendApiKey != null && !resendApiKey.isBlank()) return resendFrom;
        return smtpFrom != null ? smtpFrom : "";
    }

    public boolean sendVerificationEmail(String toEmail, String token, String firstName) {
        if (!isConfigured()) {
            log.warn("Email non configuré — vérification non envoyée à {}", toEmail);
            return false;
        }
        String link = frontendUrl + "/verify-email?token=" + token;
        return sendHtml(toEmail, "Confirmez votre compte — Snack", buildVerificationBody(firstName, link));
    }

    public boolean sendPasswordResetEmail(String toEmail, String token, String firstName) {
        if (!isConfigured()) {
            log.warn("Email non configuré — réinitialisation non envoyée à {}", toEmail);
            return false;
        }
        String link = frontendUrl + "/reset-password?token=" + token;
        return sendHtml(toEmail, "Réinitialisation de votre mot de passe — Snack", buildResetBody(firstName, link));
    }

    public boolean sendTestEmail(String toEmail) {
        if (!isConfigured()) {
            log.warn("Email non configuré — test impossible");
            return false;
        }
        String provider = (resendApiKey != null && !resendApiKey.isBlank()) ? "Resend API" : "Gmail SMTP";
        String body = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
                + "<h1 style='color:#2563eb'>Snack</h1>"
                + "<h2>Test de configuration email</h2>"
                + "<p>Si vous recevez cet email, la configuration fonctionne correctement.</p>"
                + "<p><strong>Provider :</strong> " + provider + "</p>"
                + "<p style='color:#6b7280;font-size:12px'>Envoyé depuis : " + getFromEmail() + "</p>"
                + "</div>";
        return sendHtml(toEmail, "Test de configuration email — Snack", body);
    }

    // -----------------------------------------------------------------------
    // Routage : Resend en priorité, SMTP en fallback
    // -----------------------------------------------------------------------

    private boolean sendHtml(String to, String subject, String htmlBody) {
        if (resendApiKey != null && !resendApiKey.isBlank()) {
            return sendViaResend(to, subject, htmlBody);
        }
        return sendViaSmtp(to, subject, htmlBody);
    }

    private boolean sendViaResend(String to, String subject, String htmlBody) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("from", resendFrom);
            payload.put("to", List.of(to));
            payload.put("subject", subject);
            payload.put("html", htmlBody);

            String response = resendClient.post()
                    .uri("/emails")
                    .header("Authorization", "Bearer " + resendApiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("Email envoyé via Resend à {} — réponse: {}", to, response);
            return true;
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) root = root.getCause();
            log.error("Échec envoi Resend à {} — [{}] {} | cause: [{}] {}",
                    to, e.getClass().getSimpleName(), e.getMessage(),
                    root.getClass().getSimpleName(), root.getMessage());
            return false;
        }
    }

    private boolean sendViaSmtp(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(smtpFrom);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email envoyé via Gmail SMTP à {}", to);
            return true;
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) root = root.getCause();
            log.error("Échec envoi SMTP à {} — [{}] {} | cause: [{}] {}",
                    to, e.getClass().getSimpleName(), e.getMessage(),
                    root.getClass().getSimpleName(), root.getMessage());
            return false;
        }
    }

    // -----------------------------------------------------------------------
    // Corps des emails
    // -----------------------------------------------------------------------

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
