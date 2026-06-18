package com.joel.gestion_snack.model.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

/**
 * Requête de remboursement envoyée à {@code POST /api/stripe/refund}.
 *
 * <p>Le remboursement est toujours intégral (montant total de la transaction COMPLETED).
 * Pour un remboursement partiel, il faudrait ajouter un champ {@code amountInCents}
 * et l'adapter dans {@link com.joel.gestion_snack.service.implementations.StripeService#createRefund}.</p>
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RefundRequestDTO {

    /** Identifiant de la commande à rembourser (doit avoir une transaction COMPLETED avec Stripe). */
    private Long orderId;

    /** Nom de l'utilisateur ou du rôle qui déclenche le remboursement (ex. "ADMIN", "manager1"). */
    private String refundedBy;
}
