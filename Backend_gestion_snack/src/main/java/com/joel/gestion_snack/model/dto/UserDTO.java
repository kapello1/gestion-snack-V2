package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour l'entité User
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDTO {
    private Long userId;
    private Long ownerId;
    private String username;
    private String email;
    private Long roleId;
    private String roleName;
    private Boolean pinUpToDate;
    private Boolean isActive;
    private LocalDateTime lastLogin;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

