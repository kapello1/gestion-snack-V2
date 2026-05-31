package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * DTO de requête pour créer/mettre à jour un ProviderProduct
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProviderProductRequestDTO {
    @NotNull(message = "L'ID du fournisseur est obligatoire")
    private Long providerId;

    @NotNull(message = "L'ID du produit est obligatoire")
    private Long productId;

    @NotNull(message = "La quantité est obligatoire")
    @Min(value = 1, message = "La quantité doit être au moins 1")
    private Integer quantity;

    private LocalDate supplyDate;

    private java.math.BigDecimal unitPrice;
    private java.math.BigDecimal totalAmount;

    private String createdBy;
}
