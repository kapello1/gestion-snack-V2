package com.joel.gestion_snack.security;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

/** Authentification issue d'un JWT valide, dont les droits proviennent de la base (voir {@link UserSessionService}). */
public class UserAuthenticationToken extends AbstractAuthenticationToken {

    private final AuthUser principal;
    private final Jwt jwt;

    public UserAuthenticationToken(AuthUser principal, Jwt jwt) {
        super(List.of(new SimpleGrantedAuthority("ROLE_" + principal.getRole().name())));
        this.principal = principal;
        this.jwt = jwt;
        setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return jwt;
    }

    @Override
    public AuthUser getPrincipal() {
        return principal;
    }

    @Override
    public String getName() {
        return principal.getUsername();
    }
}
