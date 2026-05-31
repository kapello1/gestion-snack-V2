package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour l'entité Provider
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProviderDTO {
    private Long providerId;
    private String name;
    private String address;
    private String phone;
    private String email;
    private String providerType;
    private String deliveryDelay;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

