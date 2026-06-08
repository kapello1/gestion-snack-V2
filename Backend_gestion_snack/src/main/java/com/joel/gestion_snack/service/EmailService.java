package com.joel.gestion_snack.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @jakarta.annotation.PostConstruct
    private void logMailConfigStatus() {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.warn("=== EMAIL NON CONFIGURÉ : MAIL_USERNAME est vide. "
                    + "Aucun email ne sera envoyé (inscription, réinitialisation). "
                    + "Définissez MAIL_USERNAME et MAIL_PASSWORD dans les variables d'environnement Render. ===");
        } else {
            log.info("=== Email configuré : from='{}' | frontend='{}' ===", fromEmail, frontendUrl);
        }
    }

    public String getFromEmail() {
        return fromEmail;
    }

    public boolean isConfigured() {
        return fromEmail != null && !fromEmail.isBlank();
    }

    public boolean sendVerificationEmail(String toEmail, String token, String firstName) {
        if (!isConfigured()) {
            log.warn("MAIL_USERNAME non configuré — email de vérification non envoyé à {}", toEmail);
            return false;
        }
        String link = frontendUrl + "/verify-email?token=" + token;
        String subject = "Confirmez votre compte — Snack";
        String body = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
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
        return sendHtml(toEmail, subject, body);
    }

    public boolean sendPasswordResetEmail(String toEmail, String token, String firstName) {
        if (!isConfigured()) {
            log.warn("MAIL_USERNAME non configuré — email de réinitialisation non envoyé à {}", toEmail);
            return false;
        }
        String link = frontendUrl + "/reset-password?token=" + token;
        String subject = "Réinitialisation de votre mot de passe — Snack";
        String body = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
                + "<h1 style='color:#2563eb'>Snack</h1>"
                + "<h2 style='color:#1f2937'>Réinitialisation du mot de passe</h2>"
                + "<p style='color:#4b5563;font-size:16px'>Bonjour " + firstName + ",</p>"
                + "<p style='color:#4b5563;font-size:16px'>Vous avez demandé la réinitialisation de votre mot de passe.</p>"
                + "<div style='text-align:center;margin:32px 0'>"
                + "<a href='" + link + "' style='display:inline-block;padding:14px 32px;background:#2563eb;"
                + "color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px'>"
                + "Réinitialiser mon mot de passe</a></div>"
                + "<p style='color:#6b7280;font-size:14px'>Ce lien expire dans <strong>1 heure</strong>.</p>"
                + "<hr style='border:none;border-top:1px solid #e5e7eb;margin:24px 0'>"
                + "<p style='color:#9ca3af;font-size:12px'>Si vous n'avez pas demandé cette réinitialisation, "
                + "ignorez cet email.</p></div>";
        return sendHtml(toEmail, subject, body);
    }

    public boolean sendTestEmail(String toEmail) {
        if (!isConfigured()) {
            log.warn("MAIL_USERNAME non configuré — impossible d'envoyer un email test");
            return false;
        }
        String subject = "Test de configuration email — Snack";
        String body = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'>"
                + "<h1 style='color:#2563eb'>Snack</h1>"
                + "<h2>Test de configuration SMTP</h2>"
                + "<p>Si vous recevez cet email, la configuration Gmail fonctionne correctement.</p>"
                + "<p style='color:#6b7280;font-size:12px'>Envoyé depuis : " + fromEmail + "</p>"
                + "</div>";
        return sendHtml(toEmail, subject, body);
    }

    private boolean sendHtml(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email envoyé avec succès à {}", to);
            return true;
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null && root.getCause() != root) {
                root = root.getCause();
            }
            log.error("Échec envoi email à {} — [{}] {} | cause: [{}] {}",
                    to, e.getClass().getSimpleName(), e.getMessage(),
                    root.getClass().getSimpleName(), root.getMessage());
            return false;
        }
    }
}
