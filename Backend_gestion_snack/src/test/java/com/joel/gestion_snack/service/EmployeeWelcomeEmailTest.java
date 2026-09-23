package com.joel.gestion_snack.service;

import com.joel.gestion_snack.model.entity.RoleType;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Contenu de l'e-mail d'accueil d'un nouvel employé : il doit annoncer les identifiants par défaut
 * (nom d'utilisateur ou adresse e-mail, mot de passe 1234) et inviter à changer le mot de passe.
 * Test sans Spring ni réseau : seul le corps HTML est vérifié.
 */
class EmployeeWelcomeEmailTest {

    private EmailService service() {
        EmailService service = new EmailService(WebClient.builder());
        ReflectionTestUtils.setField(service, "frontendUrl", "https://gestion-snack.be");
        return service;
    }

    @Test
    void annonceLEmailEtLeMotDePasseParDefaut() {
        String body = service().buildEmployeeWelcomeBody(
                "Aline", "a.laresse", "aline.laresse@example.com", RoleType.CASHIER, "1234");

        assertThat(body)
                .contains("aline.laresse@example.com")
                .contains("a.laresse")
                .contains("1234")
                .contains("Mot de passe par défaut")
                .contains("Caissier")
                .contains("https://gestion-snack.be/login")
                .contains("modifier votre mot de passe");
    }

    @Test
    void echappeLesCaracteresHtmlDesDonneesSaisies() {
        String body = service().buildEmployeeWelcomeBody(
                "<script>alert(1)</script>", "u<b>", "x@y.z", RoleType.COOK, "1234");

        assertThat(body).doesNotContain("<script>").doesNotContain("u<b>");
        assertThat(body).contains("&lt;script&gt;");
    }

    @Test
    void neSEnvoiePasSansCleBrevo() {
        boolean sent = service().sendEmployeeWelcomeEmail(
                "x@y.z", "Aline", "a.laresse", RoleType.CASHIER, "1234");

        assertThat(sent).isFalse();
    }
}
