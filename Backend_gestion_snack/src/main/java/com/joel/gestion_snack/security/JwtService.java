package com.joel.gestion_snack.security;

import com.joel.gestion_snack.model.entity.User;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Émission et validation des jetons JWT (HS256).
 *
 * <p>Le jeton ne porte que l'identité (sub = userId) et des informations de confort
 * (username, role, ownerId). Les droits réellement appliqués sont relus en base par
 * {@link UserSessionService}, ce qui permet de révoquer un compte désactivé sans attendre
 * l'expiration du jeton.
 */
@Service
@Slf4j
public class JwtService {

    static final String ISSUER = "gestion-snack";

    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final Duration lifetime;

    public JwtService(
            @Value("${jwt.secret:}") String secret,
            @Value("${jwt.expiration-minutes:480}") long expirationMinutes) {
        SecretKey key = new SecretKeySpec(deriveKey(secret), "HmacSHA256");
        this.encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        NimbusJwtDecoder nimbus = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        nimbus.setJwtValidator(JwtValidators.createDefaultWithIssuer(ISSUER));
        this.decoder = nimbus;
        this.lifetime = Duration.ofMinutes(expirationMinutes);
    }

    /** Jeton signé + date d'expiration. */
    public record IssuedToken(String value, Instant expiresAt, long expiresInSeconds) {
    }

    public IssuedToken issue(User user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(lifetime);

        JwtClaimsSet.Builder claims = JwtClaimsSet.builder()
                .issuer(ISSUER)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(String.valueOf(user.getUserId()))
                .id(UUID.randomUUID().toString())
                .claim("username", user.getUsername())
                .claim("role", user.getRole().getRoleName().name());
        if (user.getOwnerId() != null) {
            claims.claim("ownerId", user.getOwnerId());
        }

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims.build())).getTokenValue();
        return new IssuedToken(token, expiresAt, lifetime.toSeconds());
    }

    /** Valide signature, émetteur et expiration. Lève {@code JwtException} sinon. */
    public Jwt decode(String token) {
        return decoder.decode(token);
    }

    public JwtDecoder decoder() {
        return decoder;
    }

    /**
     * La clé HS256 est dérivée (SHA-256) du secret fourni : n'importe quelle longueur est acceptée,
     * l'application ne refuse donc jamais de démarrer. Sans secret, une clé aléatoire éphémère est
     * générée : l'application reste opérationnelle mais les sessions sont perdues à chaque redémarrage.
     */
    private static byte[] deriveKey(String secret) {
        byte[] material;
        if (secret == null || secret.isBlank()) {
            log.warn("=== JWT_SECRET NON DÉFINI - clé éphémère générée : les sessions seront perdues à chaque "
                    + "redémarrage. Définissez JWT_SECRET (>= 32 caractères) dans les variables d'environnement. ===");
            material = new byte[48];
            new SecureRandom().nextBytes(material);
        } else {
            if (secret.length() < 32) {
                log.warn("JWT_SECRET est court ({} caractères) : utilisez au moins 32 caractères aléatoires.",
                        secret.length());
            }
            material = secret.getBytes(StandardCharsets.UTF_8);
        }
        try {
            return MessageDigest.getInstance("SHA-256").digest(material);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponible", e);
        }
    }
}
