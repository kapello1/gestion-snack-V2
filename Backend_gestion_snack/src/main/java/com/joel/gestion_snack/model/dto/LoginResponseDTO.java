package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de réponse pour l'authentification
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponseDTO {
    private Long userId;
    private String username;
    private String email;
    private String roleName;
    private Long roleId;
    private Long ownerId;
    private String message;
    private Boolean success;
    private Boolean requiresTwoFactor;
    private Long twoFactorUserId;

    // Vérification de nouvel appareil
    private Boolean requiresDeviceVerification;
    private Long deviceVerificationUserId;
    private String newDeviceToken; // renvoyé après validation réussie, à stocker dans localStorage
}

