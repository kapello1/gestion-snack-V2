package com.joel.gestion_snack.security;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Sécurité de l'API : sans session, authentification par JWT « Bearer », droits fins par méthode
 * via {@code @PreAuthorize}.
 *
 * <p>Deux niveaux : (1) ici, tout ce qui n'est pas explicitement public exige un jeton valide ;
 * (2) sur chaque endpoint, {@code @PreAuthorize} précise le ou les rôles autorisés.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    @Value("${allowed.origins:http://localhost:5173}")
    private String allowedOrigins;

    private final JwtAuthConverter jwtAuthConverter;
    private final RestSecurityErrorHandlers errorHandlers;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable) // API sans cookie ni session : pas de CSRF possible
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/error").permitAll()
                        // Documentation et supervision
                        .requestMatchers("/api/health", "/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // WebSocket : l'authentification est faite sur la trame STOMP CONNECT
                        // (StompAuthChannelInterceptor), le navigateur ne pouvant pas ajouter d'en-tête au handshake
                        .requestMatchers("/ws/**", "/ws-sockjs/**").permitAll()
                        // Authentification, 2FA et réinitialisation du mot de passe
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/login", "/api/auth/verify-2fa", "/api/auth/resend-2fa",
                                "/api/auth/forgot-password", "/api/auth/verify-reset-code",
                                "/api/auth/reset-password").permitAll()
                        // Inscription client et vérification de l'email
                        .requestMatchers(HttpMethod.POST, "/api/customers", "/api/customers/verify-email-code").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/customers/verify/*").permitAll()
                        // Vitrine publique (landing) : catalogue en lecture seule
                        .requestMatchers(HttpMethod.GET, "/api/products").permitAll()
                        // Webhook Stripe : authentifié par la signature HMAC, pas par un jeton
                        .requestMatchers(HttpMethod.POST, "/api/stripe/webhook").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter))
                        .authenticationEntryPoint(errorHandlers)
                        .accessDeniedHandler(errorHandlers))
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint(errorHandlers)
                        .accessDeniedHandler(errorHandlers));
        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder(JwtService jwtService) {
        return jwtService.decoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.stream(allowedOrigins.split(","))
                .map(String::trim).filter(o -> !o.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
