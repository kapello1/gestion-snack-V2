package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.ProductType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO de requête pour créer/mettre à jour un Product
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductRequestDTO {
    @NotBlank(message = "Le nom du produit est obligatoire")
    private String productName;
    
    @NotNull(message = "Le prix unitaire est obligatoire")
    @DecimalMin(value = "0.0", message = "Le prix doit être positif")
    private BigDecimal unitPrice;
    
    @NotNull(message = "La quantité disponible est obligatoire")
    @Min(value = 0, message = "La quantité doit être positive")
    private Integer quantityAvailable;
    
    @NotNull(message = "Le seuil d'alerte est obligatoire")
    @Min(value = 0, message = "Le seuil d'alerte doit être positif")
    private Integer alertThreshold;
    
    @NotNull(message = "Le type de produit est obligatoire")
    private ProductType productType;
    
    private Long categoryId;
    private Long stockId;
    private String description;
    private String alergy;
    private String imageUrl;
    
    private Boolean needsSauce;
    private Boolean needsViande;
    private String createdBy;
}

