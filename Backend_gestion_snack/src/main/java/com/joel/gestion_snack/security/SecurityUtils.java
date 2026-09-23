package com.joel.gestion_snack.security;

import com.joel.gestion_snack.model.entity.RoleType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Accès à l'utilisateur authentifié depuis la couche service. */
public final class SecurityUtils {

    private SecurityUtils() {
    }

    /** Utilisateur de la requête courante, ou {@code null} hors requête authentifiée. */
    public static AuthUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof AuthUser user ? user : null;
    }

    public static boolean isAdmin() {
        AuthUser user = currentUser();
        return user != null && user.getRole() == RoleType.ADMIN;
    }
}
