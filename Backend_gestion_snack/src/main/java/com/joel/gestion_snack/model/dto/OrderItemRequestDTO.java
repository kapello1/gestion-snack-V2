package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO de requête pour créer/mettre à jour un OrderItem
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderItemRequestDTO {
    @NotNull(message = "L'ID du produit est obligatoire")
    private Long productId;
    
    @NotNull(message = "La quantité est obligatoire")
    @Min(value = 1, message = "La quantité doit être au moins 1")
    private Integer quantity;
    
    private BigDecimal unitPrice; // Optionnel, sera récupéré du produit si non fourni
    private Long orderItemId;
    private Long saleId;
}

