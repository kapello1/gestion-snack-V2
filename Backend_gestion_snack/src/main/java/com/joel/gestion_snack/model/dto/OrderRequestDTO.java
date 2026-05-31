package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.OrderType;
import com.joel.gestion_snack.model.entity.PaymentMethodType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;
import java.util.List;

/**
 * DTO de requête pour créer/mettre à jour une Order
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderRequestDTO {
    private Long tableId;
    private Long customerId;

    @NotNull(message = "Le type de commande est obligatoire")
    private OrderType orderType;

    @NotNull(message = "La méthode de paiement est obligatoire")
    private PaymentMethodType paymentMethod;

    private LocalTime pickupTime;

    private Integer guestCount;

    @Valid
    @NotNull(message = "Les articles de commande sont obligatoires")
    private List<OrderItemRequestDTO> orderItems;

    private String createdBy;
}
