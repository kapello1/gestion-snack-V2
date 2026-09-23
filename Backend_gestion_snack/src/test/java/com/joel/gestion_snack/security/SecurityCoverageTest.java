package com.joel.gestion_snack.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Filet de sécurité : aucun endpoint ne peut être ajouté sans décision de sécurité explicite.
 * Chaque méthode exposée porte un {@code @PreAuthorize}, ou figure dans la liste des endpoints
 * volontairement publics (qui doit rester identique aux règles {@code permitAll} de {@link SecurityConfig}).
 */
class SecurityCoverageTest {

    /** Endpoints publics : authentification, inscription, vitrine, webhook signé, supervision. */
    private static final Set<String> PUBLIC_ENDPOINTS = Set.of(
            "AuthControllerImpl#login",
            "AuthControllerImpl#verify2FA",
            "AuthControllerImpl#resend2FA",
            "AuthControllerImpl#verifyResetCode",
            "AuthControllerImpl#forgotPassword",
            "AuthControllerImpl#resetPassword",
            "CustomerControllerImpl#createCustomer",
            "CustomerControllerImpl#verifyEmailCode",
            "CustomerControllerImpl#verifyEmail",
            "ProductControllerImpl#getAllProducts",
            "StripeController#handleWebhook",
            "HealthController#health");

    private static List<Method> endpoints() throws ClassNotFoundException {
        ClassPathScanningCandidateComponentProvider scanner = new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));
        List<Method> methods = new ArrayList<>();
        for (BeanDefinition bd : scanner.findCandidateComponents("com.joel.gestion_snack")) {
            Class<?> controller = Class.forName(bd.getBeanClassName());
            for (Method m : controller.getDeclaredMethods()) {
                if (!m.isSynthetic() && AnnotatedElementUtils.hasAnnotation(m, RequestMapping.class)) {
                    methods.add(m);
                }
            }
        }
        return methods;
    }

    private static String key(Method m) {
        return m.getDeclaringClass().getSimpleName() + "#" + m.getName();
    }

    @Test
    void chaqueEndpointEstProtegeOuExplicitementPublic() throws Exception {
        List<Method> endpoints = endpoints();
        assertThat(endpoints).as("contrôleurs détectés").hasSizeGreaterThan(100);

        List<String> sansProtection = endpoints.stream()
                .filter(m -> !AnnotatedElementUtils.hasAnnotation(m, PreAuthorize.class))
                .map(SecurityCoverageTest::key)
                .filter(k -> !PUBLIC_ENDPOINTS.contains(k))
                .sorted()
                .toList();

        assertThat(sansProtection)
                .as("endpoints sans @PreAuthorize et absents de la liste publique")
                .isEmpty();
    }

    @Test
    void laListePubliqueNeContientAucunEndpointObsoleteOuProtegeParErreur() throws Exception {
        Set<String> exposes = new TreeSet<>();
        for (Method m : endpoints()) {
            exposes.add(key(m));
        }
        assertThat(exposes).containsAll(PUBLIC_ENDPOINTS);

        // un endpoint public ne doit pas non plus porter un @PreAuthorize contradictoire
        List<String> incoherents = endpoints().stream()
                .filter(m -> PUBLIC_ENDPOINTS.contains(key(m)))
                .filter(m -> AnnotatedElementUtils.hasAnnotation(m, PreAuthorize.class))
                .map(SecurityCoverageTest::key)
                .toList();
        assertThat(incoherents).isEmpty();
    }

    /** Une faute de frappe dans une expression SpEL ne se verrait qu'à l'exécution (erreur 500). */
    @Test
    void lesParametresReferencesDansLesExpressionsExistent() throws Exception {
        Pattern ref = Pattern.compile("#(\\w+)");
        List<String> erreurs = new ArrayList<>();
        for (Method m : endpoints()) {
            PreAuthorize pa = AnnotatedElementUtils.findMergedAnnotation(m, PreAuthorize.class);
            if (pa == null) {
                continue;
            }
            Set<String> noms = new TreeSet<>();
            for (Parameter p : m.getParameters()) {
                assertThat(p.isNamePresent())
                        .as("compilation avec -parameters requise pour résoudre " + key(m))
                        .isTrue();
                noms.add(p.getName());
            }
            Matcher matcher = ref.matcher(pa.value());
            while (matcher.find()) {
                if (!noms.contains(matcher.group(1))) {
                    erreurs.add(key(m) + " référence #" + matcher.group(1) + " (paramètres: " + noms + ")");
                }
            }
        }
        assertThat(erreurs).isEmpty();
    }

    @Test
    void lesExpressionsUtilisentUniquementDesRolesEtReglesConnus() throws Exception {
        Pattern role = Pattern.compile("'(ADMIN|CASHIER|WAITER|COOK|CUSTOMER|PROVIDER)'");
        Pattern authz = Pattern.compile("@authz\\.(\\w+)\\(");
        Set<String> regles = Set.of("isUser", "isCustomer", "isProvider", "isEmployee",
                "ownsOrder", "ownsReservation", "ownsReview", "ownsSupply", "ownsMessage", "canReadMessage");
        List<String> erreurs = new ArrayList<>();
        for (Method m : endpoints()) {
            PreAuthorize pa = AnnotatedElementUtils.findMergedAnnotation(m, PreAuthorize.class);
            if (pa == null) {
                continue;
            }
            String expr = pa.value();
            // tout littéral entre apostrophes dans hasRole/hasAnyRole doit être un rôle valide
            Matcher lit = Pattern.compile("hasA?n?y?Role\\(([^)]*)\\)").matcher(expr);
            while (lit.find()) {
                String args = lit.group(1).replaceAll("'(ADMIN|CASHIER|WAITER|COOK|CUSTOMER|PROVIDER)'", "").replaceAll("[,\\s]", "");
                if (!args.isEmpty()) {
                    erreurs.add(key(m) + " rôle inconnu dans : " + expr);
                }
            }
            Matcher a = authz.matcher(expr);
            while (a.find()) {
                if (!regles.contains(a.group(1))) {
                    erreurs.add(key(m) + " règle @authz inconnue : " + a.group(1));
                }
            }
            assertThat(role.matcher(expr).find() || expr.contains("isAuthenticated()") || expr.contains("@authz"))
                    .as("expression sans contrôle : " + key(m)).isTrue();
        }
        assertThat(erreurs).isEmpty();
    }
}
