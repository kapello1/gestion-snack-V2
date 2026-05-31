package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private String message;
    private LocalDateTime alertDate;
    private Boolean resolved;
}

