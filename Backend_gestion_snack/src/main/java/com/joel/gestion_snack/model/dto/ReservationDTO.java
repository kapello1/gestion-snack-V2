package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.ReservationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * DTO pour l'entité Reservation
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDTO {
    private Long reservationId;
    private Long customerId;
    private String customerName;
    private Long tableId;
    private LocalDateTime datetimeFrom;
    private LocalDateTime datetimeTo;
    private Integer places;
    private String attribut55;
    private ReservationStatus status;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}
