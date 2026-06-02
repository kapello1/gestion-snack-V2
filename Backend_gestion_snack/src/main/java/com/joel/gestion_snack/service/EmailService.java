package com.joel.gestion_snack.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

/**
 * Service d'envoi d'emails (vérification compte, réinitialisation mot de passe)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public void sendVerificationEmail(String toEmail, String token, String firstName) {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.warn("MAIL_USERNAME non configuré — email de vérification non envoyé à {}", toEmail);
            return;
        }
        String link = frontendUrl + "/verify-email?token=" + token;
        String subject = "Confirmez votre compte — Snack";
        String body = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto'>"
                + "<h2 style='color:#2563eb'>Bienvenue, " + firstName + " !</h2>"
                + "<p>Merci de vous être inscrit. Cliquez sur le bouton ci-dessous pour activer votre compte :</p>"
                + "<a href='" + link + "' style='display:inline-block;padding:12px 24px;background:#2563eb;"
                + "color:#fff;border-radius:6px;text-decoration:none;font-weight:bold'>Confirmer mon compte</a>"
                + "<p style='margin-top:16px;color:#6b7280'>Ce lien expire dans 24 heures.</p>"
                + "<p style='color:#6b7280'>Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>"
                + "</div>";
        sendHtml(toEmail, subject, body);
    }

    public void sendPasswordResetEmail(String toEmail, String token, String firstName) {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.warn("MAIL_USERNAME non configuré — email de réinitialisation non envoyé à {}", toEmail);
            return;
        }
        String link = frontendUrl + "/reset-password?token=" + token;
        String subject = "Réinitialisation de votre mot de passe — Snack";
        String body = "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto'>"
                + "<h2 style='color:#2563eb'>Réinitialisation du mot de passe</h2>"
                + "<p>Bonjour " + firstName + ",</p>"
                + "<p>Vous avez demandé la réinitialisation de votre mot de passe. "
                + "Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe :</p>"
                + "<a href='" + link + "' style='display:inline-block;padding:12px 24px;background:#2563eb;"
                + "color:#fff;border-radius:6px;text-decoration:none;font-weight:bold'>Réinitialiser mon mot de passe</a>"
                + "<p style='margin-top:16px;color:#6b7280'>Ce lien expire dans 1 heure.</p>"
                + "<p style='color:#6b7280'>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>"
                + "</div>";
        sendHtml(toEmail, subject, body);
    }

    private void sendHtml(String to, String subject, String htmlBody) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Email envoyé à {}", to);
        } catch (MessagingException e) {
            log.error("Erreur lors de l'envoi de l'email à {} : {}", to, e.getMessage());
        }
    }
}
