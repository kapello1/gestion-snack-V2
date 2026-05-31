package com.joel.gestion_snack.model.entity;

/**
 * Statut d'une transaction de paiement (aligné sur transaction_status_type en base)
 */
public enum TransactionStatusType {
    PENDING,
    COMPLETED,
    FAILED,
    REFUNDED
}
