package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequestDTO {
    private Long ownerId;

    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    private String username;

    private String password;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;

    private Long roleId;

    private Boolean pinUpToDate;
    private Boolean isActive;
    private String createdBy;
}
