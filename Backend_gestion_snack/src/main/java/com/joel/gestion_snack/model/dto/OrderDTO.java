package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.OrderStatus;
import com.joel.gestion_snack.model.entity.OrderType;
import com.joel.gestion_snack.model.entity.PaymentMethodType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/**
 * DTO pour l'entité Order
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderDTO {
    private Long orderId;
    private Long tableId;
    private Long customerId;
    private CustomerDTO customer;
    private BigDecimal totalAmount;
    private LocalDate orderDate;
    private PaymentMethodType paymentMethod;
    private OrderType orderType;
    private LocalTime pickupTime;
    private Integer guestCount;
    private OrderStatus status;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private List<OrderItemDTO> orderItems;
    /** Indique si un paiement COMPLETED est enregistré pour cette commande */
    private Boolean paymentCompleted;
}
