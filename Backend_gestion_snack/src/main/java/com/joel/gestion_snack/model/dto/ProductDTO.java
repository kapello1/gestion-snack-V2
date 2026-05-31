package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.ProductType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO pour l'entité Product
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {
    private Long productId;
    private String productName;
    private BigDecimal unitPrice;
    private Integer quantityAvailable;
    private Integer alertThreshold;
    private Long categoryId;
    private Long stockId;
    private String description;
    private String alergy;
    private String imageUrl;
    private ProductType productType;
    private Boolean needsSauce;
    private Boolean needsViande;
    private Double averageRating;
    private Integer reviewCount;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}

