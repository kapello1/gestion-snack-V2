package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.RoleType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour l'entité Role
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RoleDTO {
    private Long roleId;
    private RoleType roleName;
    private String description;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

