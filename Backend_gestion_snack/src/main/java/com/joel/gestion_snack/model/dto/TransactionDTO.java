package com.joel.gestion_snack.model.dto;

import com.joel.gestion_snack.model.entity.PaymentMethodType;
import com.joel.gestion_snack.model.entity.TransactionStatusType;
import com.joel.gestion_snack.model.entity.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDTO {
    private Long idTransaction;
    private Long orderId;
    private OrderStatus orderStatus;
    private Long customerId;
    private String customerFullName;
    private PaymentMethodType paymentMethod;
    private BigDecimal amount;
    private TransactionStatusType status;
    private LocalDateTime transactionDate;
    private String stripePaymentIntentId;
    private String createdBy;
    private LocalDateTime createdAt;
}
