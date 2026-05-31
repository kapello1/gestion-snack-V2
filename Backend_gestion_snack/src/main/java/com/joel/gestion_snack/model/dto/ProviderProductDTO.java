package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO pour l'entité ProviderProduct
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProviderProductDTO {
    private Long provideId;
    private Long providerId;
    private String providerName;
    private Long productId;
    private String productName;
    private Integer quantity;
    private LocalDate supplyDate;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
