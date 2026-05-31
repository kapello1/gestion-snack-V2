package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.RoleType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de requête pour créer/mettre à jour un Role
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleRequestDTO {
    @NotNull(message = "Le nom du rôle est obligatoire")
    private RoleType roleName;
    private String description;
    private String createdBy;
}

