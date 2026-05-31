package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de requête pour créer/mettre à jour une Review
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReviewRequestDTO {
    private Long customerId;
    
    private String comment;
    private Integer star;
    private Long productId;
    private String createdBy;
}

