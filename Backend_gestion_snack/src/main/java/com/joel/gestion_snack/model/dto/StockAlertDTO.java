package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO pour l'entité StockAlert
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAlertDTO {
    private Long alertId;
    private Long productId;
    private String productName;
    private String productType;
    private BigDecimal productPrice;
    private BigDecimal purchasePrice;
    private String imageUrl;
    private Integer currentStock;
    private Integer alertThreshold;
    private String message;
    private LocalDateTime alertDate;
    private Boolean resolved;
    private Integer requestedQuantity;
    private String triggeredBy;
}

