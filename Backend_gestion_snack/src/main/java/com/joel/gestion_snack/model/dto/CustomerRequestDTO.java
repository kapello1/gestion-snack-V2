package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de requête pour créer/mettre à jour un Customer
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CustomerRequestDTO {
    @NotBlank(message = "Le prénom est obligatoire")
    private String firstName;
    
    @NotBlank(message = "Le nom est obligatoire")
    private String lastName;
    
    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    private String username;
    
    private String address;
    private String phone;
    
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;
    
    private String createdBy;

    private String password;
}

