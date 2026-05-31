package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO de requête pour créer/mettre à jour une Reservation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservationRequestDTO {
    @NotNull(message = "L'ID du client est obligatoire")
    private Long customerId;
    
    @NotNull(message = "L'ID de la table est obligatoire")
    private Long tableId;
    
    @NotNull(message = "L'heure de début est obligatoire")
    private LocalDateTime datetimeFrom;
    
    @NotNull(message = "L'heure de fin est obligatoire")
    private LocalDateTime datetimeTo;
    
    @NotNull(message = "Le nombre de places est obligatoire")
    @Min(value = 1, message = "Le nombre de places doit être au moins 1")
    private Integer places;
    
    private String attribut55;
    
    private String createdBy;
}

