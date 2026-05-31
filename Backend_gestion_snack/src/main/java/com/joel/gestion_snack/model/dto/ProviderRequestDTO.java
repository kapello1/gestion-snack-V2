package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de requête pour créer/mettre à jour un Provider
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProviderRequestDTO {
    @NotBlank(message = "Le nom est obligatoire")
    private String name;
    
    private String address;
    private String phone;
    
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;
    
    private String providerType;
    private String deliveryDelay;
    private String createdBy;
}

