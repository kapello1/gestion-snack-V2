package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProviderProductDTO {
    // Identifiants
    private Long provideId;
    private Long providerId;
    private String providerName;

    // Produit - identifiants
    private Long productId;
    private String productName;

    // Produit - details complets
    private String productType;
    private String productDescription;
    private String imageUrl;
    private BigDecimal unitSalePrice;    // prix de vente restaurant
    private BigDecimal purchasePrice;    // prix d'achat fournisseur
    private Integer currentStock;
    private Integer alertThreshold;

    // Bon de commande
    private Integer quantity;
    private BigDecimal unitPrice;        // prix unitaire du bon de commande (= purchasePrice saisi)
    private BigDecimal totalAmount;
    private LocalDate supplyDate;
    private String status;              // PENDING | VALIDATED
    private LocalDateTime validatedAt;

    // Audit
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
