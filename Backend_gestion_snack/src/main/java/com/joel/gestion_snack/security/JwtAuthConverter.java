package com.joel.gestion_snack.security;

import lombok.RequiredArgsConstructor;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Transforme un JWT valide en authentification, en vérifiant que le compte est toujours actif. */
@Component
@RequiredArgsConstructor
public class JwtAuthConverter implements Converter<Jwt, UserAuthenticationToken> {

    private final UserSessionService sessions;

    @Override
    public UserAuthenticationToken convert(Jwt jwt) {
        return new UserAuthenticationToken(authenticate(jwt), jwt);
    }

    AuthUser authenticate(Jwt jwt) throws AuthenticationException {
        Long userId;
        try {
            userId = Long.valueOf(jwt.getSubject());
        } catch (NumberFormatException e) {
            throw new BadCredentialsException("Jeton invalide");
        }
        return sessions.resolve(userId)
                .orElseThrow(() -> new BadCredentialsException("Session invalide ou compte désactivé"));
    }
}
