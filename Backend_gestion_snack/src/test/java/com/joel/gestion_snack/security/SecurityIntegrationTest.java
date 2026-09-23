package com.joel.gestion_snack.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.joel.gestion_snack.repository.CustomerRepository;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

/**
 * Matrice d'accès de bout en bout (filtre JWT + @PreAuthorize + base PostgreSQL réelle).
 *
 * <p>Nécessite une base initialisée avec {@code snack_db_postgres.sql} (comptes de démonstration, mot de
 * passe 1234). Désactivé par défaut : il ne s'exécute que si {@code RUN_DB_TESTS=true}, ce qui évite
 * qu'un {@code mvn test} local ne vise par erreur la base de production définie dans {@code .env}.
 * Tests en lecture seule : aucune donnée n'est modifiée.
 */
@SpringBootTest
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class SecurityIntegrationTest {

    private static final Map<String, String> USERS = Map.of(
            "ADMIN", "a.smith", "WAITER", "b.johnson", "COOK", "c.cuisinier",
            "CASHIER", "a.laresse", "CUSTOMER", "jean.dupont", "PROVIDER", "john.supply1");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired CustomerRepository customerRepository;

    private final Map<String, JsonNode> sessions = new HashMap<>();

    private JsonNode login(String identifier) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(mapper.writeValueAsString(Map.of("username", identifier, "password", "1234"))))
                .andReturn();
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    private JsonNode session(String role) throws Exception {
        JsonNode s = sessions.get(role);
        if (s == null) {
            s = login(USERS.get(role));
            Assumptions.assumeTrue(s.hasNonNull("token"),
                    "Connexion sans jeton (2FA active ou base non initialisée) : test ignoré");
            sessions.put(role, s);
        }
        return s;
    }

    private String bearer(String role) throws Exception {
        return "Bearer " + session(role).get("token").asText();
    }

    @Test
    void sansJetonLesEndpointsProtegesRenvoient401() throws Exception {
        mvc.perform(get("/api/orders")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
        mvc.perform(get("/api/users")).andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isUnauthorized());
    }

    @Test
    void lesEndpointsPublicsRestentAccessibles() throws Exception {
        assertThat(mvc.perform(get("/api/health")).andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(get("/api/products")).andReturn().getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void unJetonFalsifieEstRefuse() throws Exception {
        String valid = session("ADMIN").get("token").asText();
        String[] parts = valid.split("\\.");
        String tampered = parts[0] + "." + parts[1] + "." + (parts[2].startsWith("A") ? "B" : "A") + parts[2].substring(1);
        assertThat(mvc.perform(get("/api/orders").header("Authorization", "Bearer " + tampered))
                .andReturn().getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void laConnexionAccepteLEmailEnPlusDuNomDUtilisateur() throws Exception {
        JsonNode byEmail = login("a.smith@gmail.com");
        Assumptions.assumeTrue(byEmail.hasNonNull("token"), "2FA active : test ignoré");
        assertThat(byEmail.get("username").asText()).isEqualTo("a.smith");
    }

    @Test
    void unClientNeVoitQueSesCommandes() throws Exception {
        long own = session("CUSTOMER").get("ownerId").asLong();
        long other = customerRepository.findByUsername("marie.simo").orElseThrow().getCustomerId();
        assertThat(mvc.perform(get("/api/orders/customer/" + own).header("Authorization", bearer("CUSTOMER")))
                .andReturn().getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(get("/api/orders/customer/" + other).header("Authorization", bearer("CUSTOMER")))
                .andReturn().getResponse().getStatus()).isEqualTo(403);
    }

    @ParameterizedTest(name = "{0} {1} {2} -> {3}")
    @CsvSource({
            // ADMIN : accès complet
            "ADMIN,GET,/api/users,200", "ADMIN,GET,/api/audit-logs,200", "ADMIN,GET,/api/revenue/total,200",
            "ADMIN,GET,/api/employees,200", "ADMIN,GET,/api/providers,200", "ADMIN,GET,/api/transactions,200",
            // CUISINIER : file de cuisine et alertes de stock, rien d'autre
            "COOK,GET,/api/orders,200", "COOK,GET,/api/stock-alerts,200", "COOK,GET,/api/users,403",
            "COOK,GET,/api/employees,403", "COOK,GET,/api/revenue/total,403", "COOK,POST,/api/orders/1/serve,403",
            // SERVEUR
            "WAITER,GET,/api/tables,200", "WAITER,GET,/api/customers,200", "WAITER,GET,/api/orders,200",
            "WAITER,GET,/api/audit-logs,403", "WAITER,GET,/api/stock-alerts,403", "WAITER,POST,/api/orders/1/start,403",
            // CAISSIER
            "CASHIER,GET,/api/orders,200", "CASHIER,GET,/api/users,403", "CASHIER,POST,/api/orders/1/start,403",
            "CASHIER,GET,/api/revenue/today,403",
            // CLIENT
            "CUSTOMER,GET,/api/tables,200", "CUSTOMER,GET,/api/sauces/available,200",
            "CUSTOMER,GET,/api/users,403", "CUSTOMER,GET,/api/orders,403", "CUSTOMER,GET,/api/customers,403",
            "CUSTOMER,GET,/api/audit-logs,403", "CUSTOMER,GET,/api/transactions,403", "CUSTOMER,DELETE,/api/employees/1,403",
            "CUSTOMER,DELETE,/api/products/1,403", "CUSTOMER,GET,/api/roles,403",
            // FOURNISSEUR
            "PROVIDER,GET,/api/orders,403", "PROVIDER,GET,/api/providers,403", "PROVIDER,GET,/api/customers,403",
            "PROVIDER,GET,/api/providers/supplies,403"
    })
    void matriceDAcces(String role, String method, String url, int expected) throws Exception {
        int status = mvc.perform(request(org.springframework.http.HttpMethod.valueOf(method), url)
                        .header("Authorization", bearer(role)))
                .andReturn().getResponse().getStatus();
        if (expected == 200) {
            assertThat(status).as("%s %s en tant que %s", method, url, role).isNotIn(401, 403);
        } else {
            assertThat(status).as("%s %s en tant que %s", method, url, role).isEqualTo(expected);
        }
    }

    @Test
    void unClientNePeutPasSupprimerUnEmployeMemeAvecUnCorpsInvalide() throws Exception {
        assertThat(mvc.perform(delete("/api/employees/1").header("Authorization", bearer("CUSTOMER")))
                .andReturn().getResponse().getStatus()).isEqualTo(403);
    }
}
