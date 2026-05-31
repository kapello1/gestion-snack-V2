package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.TableStatusType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour l'entité DiningTable
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiningTableDTO {
    private Long tableId;
    private Long orderId;
    private Integer tableNumber;
    private Integer capacity;
    private TableStatusType status;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private Integer occupiedSeats;
    private Long activeReservationId;
    private Long reservedForCustomerId;
    private String reservedForCustomerName;
    private java.time.LocalDateTime activeReservationDate;
    private String reservedForCustomerPhone;
    private String reservedForCustomerEmail;
}
