package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.PaymentMethodType;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OrderPaymentRequestDTO {
    @NotNull(message = "La méthode de paiement est obligatoire")
    private PaymentMethodType paymentMethod;

    private String createdBy;
}
