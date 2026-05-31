package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.TableStatusType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO de requête pour créer/mettre à jour une DiningTable
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiningTableRequestDTO {
    private Long orderId;
    
    @NotNull(message = "Le numéro de table est obligatoire")
    private Integer tableNumber;
    
    @NotNull(message = "La capacité est obligatoire")
    @Min(value = 1, message = "La capacité doit être au moins 1")
    private Integer capacity;
    
    private TableStatusType status;
    private String createdBy;
}

