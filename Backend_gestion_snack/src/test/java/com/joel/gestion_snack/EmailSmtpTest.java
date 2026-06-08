package com.joel.gestion_snack;

import jakarta.mail.*;
import jakarta.mail.internet.*;
import org.junit.jupiter.api.Test;

import java.util.Properties;

/**
 * Test direct SMTP sans contexte Spring.
 * Nécessite MAIL_USERNAME et MAIL_PASSWORD en variables d'environnement.
 */
class EmailSmtpTest {

    @Test
    void sendSmtpTestEmail() throws Exception {
        String username = System.getenv("MAIL_USERNAME");
        String password = System.getenv("MAIL_PASSWORD");
        String to = System.getenv("MAIL_TEST_TO");

        org.junit.jupiter.api.Assumptions.assumeTrue(
                username != null && !username.isBlank(),
                "MAIL_USERNAME non defini — test ignore");

        if (to == null || to.isBlank()) to = "tiegnigamobernardjoel@gmail.com";

        System.out.println("=== Test SMTP ===");
        System.out.println("From : " + username);
        System.out.println("To   : " + to);

        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        props.put("mail.smtp.host", "smtp.gmail.com");
        props.put("mail.smtp.port", "587");
        props.put("mail.smtp.ssl.trust", "smtp.gmail.com");
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "10000");

        Session session = Session.getInstance(props, new Authenticator() {
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });
        session.setDebug(true);

        Message message = new MimeMessage(session);
        message.setFrom(new InternetAddress(username, "Snack App"));
        message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(to));
        message.setSubject("Test SMTP — Snack App");
        message.setContent(
                "<div style='font-family:Arial,sans-serif;padding:20px'>"
                + "<h2 style='color:#2563eb'>Test SMTP reussi</h2>"
                + "<p>La configuration Gmail fonctionne correctement.</p>"
                + "<p><strong>De :</strong> " + username + "</p>"
                + "<p><strong>A :</strong> " + to + "</p>"
                + "</div>",
                "text/html; charset=utf-8");

        Transport.send(message);
        System.out.println("=== Email envoye avec succes ! ===");
    }
}
