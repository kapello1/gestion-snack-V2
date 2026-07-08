package com.joel.gestion_snack.controller;

import com.joel.gestion_snack.model.dto.OrderDTO;
import com.joel.gestion_snack.model.dto.TransactionDTO;
import com.joel.gestion_snack.model.entity.OrderStatus;
import com.joel.gestion_snack.model.entity.Transaction;
import com.joel.gestion_snack.model.entity.TransactionStatusType;
import com.joel.gestion_snack.repository.TransactionRepository;
import com.joel.gestion_snack.service.implementations.OrderServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Transactions", description = "Historique et remboursements des transactions")
public class TransactionController {

    private final TransactionRepository transactionRepository;
    private final OrderServiceImpl orderService;

    @GetMapping
    @Operation(summary = "Récupérer toutes les transactions triées par date décroissante")
    public ResponseEntity<List<TransactionDTO>> getAllTransactions() {
        List<TransactionDTO> dtos = transactionRepository.findAllByOrderByTransactionDateDesc()
                .stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/{id}/refund")
    @Operation(summary = "Rembourser une transaction (Stripe ou espèces)")
    public ResponseEntity<?> refundTransaction(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {

        Transaction transaction = transactionRepository.findById(id).orElse(null);
        if (transaction == null) {
            return ResponseEntity.notFound().build();
        }

        if (transaction.getOrder().getStatus() != OrderStatus.ACTIVE) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Le remboursement n'est possible que pour les commandes en attente de préparation (ACTIVE)"));
        }

        if (transaction.getStatus() == TransactionStatusType.REFUNDED) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Cette transaction a déjà été remboursée"));
        }

        String refundedBy = (body != null && body.get("refundedBy") != null) ? body.get("refundedBy") : "ADMIN";

        try {
            if (transaction.getStripePaymentIntentId() != null && !transaction.getStripePaymentIntentId().isBlank()) {
                // Paiement Stripe : déléguer à la logique existante
                OrderDTO order = orderService.refundOrder(transaction.getOrder().getOrderId(), refundedBy);
                log.info("Remboursement Stripe effectué — transaction {}", id);
                return ResponseEntity.ok(order);
            } else {
                // Paiement en espèces : annuler manuellement
                transaction.setStatus(TransactionStatusType.REFUNDED);
                transaction.setUpdatedBy(refundedBy);
                transactionRepository.save(transaction);

                orderService.cancelOrder(transaction.getOrder().getOrderId());

                log.info("Remboursement espèces enregistré — transaction {}", id);
                return ResponseEntity.ok(Map.of("message", "Remboursement enregistré avec succès"));
            }
        } catch (IllegalStateException e) {
            log.warn("Remboursement refusé — transaction {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur remboursement — transaction {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(Map.of("message", "Remboursement impossible: " + e.getMessage()));
        }
    }

    private TransactionDTO toDTO(Transaction t) {
        TransactionDTO dto = new TransactionDTO();
        dto.setIdTransaction(t.getIdTransaction());
        dto.setPaymentMethod(t.getPaymentMethod());
        dto.setAmount(t.getAmount());
        dto.setStatus(t.getStatus());
        dto.setTransactionDate(t.getTransactionDate());
        dto.setStripePaymentIntentId(t.getStripePaymentIntentId());
        dto.setCreatedBy(t.getCreatedBy());
        dto.setCreatedAt(t.getCreatedAt());

        if (t.getOrder() != null) {
            dto.setOrderId(t.getOrder().getOrderId());
            dto.setOrderStatus(t.getOrder().getStatus());
        }
        if (t.getCustomer() != null) {
            dto.setCustomerId(t.getCustomer().getCustomerId());
            dto.setCustomerFullName(t.getCustomer().getFirstName() + " " + t.getCustomer().getLastName());
        }
        return dto;
    }
}
