package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de requête pour créer/mettre à jour un utilisateur
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRequestDTO {
    @NotNull(message = "L'ID du propriétaire est obligatoire")
    private Long ownerId;
    
    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    private String username;
    
    @NotBlank(message = "Le mot de passe est obligatoire")
    private String password;
    
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;
    
    @NotNull(message = "L'ID du rôle est obligatoire")
    private Long roleId;
    
    private Boolean pinUpToDate = false;
    private Boolean isActive = true;
    private String createdBy;
}

