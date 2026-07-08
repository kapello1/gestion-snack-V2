package com.joel.gestion_snack.model.entity;

/**
 * Enum représentant le statut d'une commande
 */
public enum OrderStatus {
    /** Commande reçue, en attente de prise en charge par la cuisine */
    ACTIVE,
    /** Cuisinier a commencé la préparation */
    IN_PREPARATION,
    /** Préparation terminée — prête à être servie */
    CLOSED,
    /** Servie au client */
    SERVED,
    /** Annulée ou remboursée */
    CANCELLED
}
