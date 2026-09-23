package com.joel.gestion_snack.security;

import com.joel.gestion_snack.model.entity.RoleType;
import lombok.Value;

/**
 * Utilisateur authentifié pour la requête courante (principal Spring Security).
 * {@code ownerId} référence la fiche métier : employé, client ou fournisseur selon le rôle.
 */
@Value
public class AuthUser {
    Long userId;
    String username;
    RoleType role;
    Long ownerId;
}
