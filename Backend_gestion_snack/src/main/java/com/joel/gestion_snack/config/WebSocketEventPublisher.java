package com.joel.gestion_snack.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Publie des événements temps réel vers les clients WebSocket connectés.
 * Tous les appels sont silencieux : une absence de client ne bloque jamais
 * la logique métier.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Notifie tous les abonnés /topic/orders qu'une commande a changé.
     *
     * @param type    type d'événement (ORDER_CREATED, ORDER_CLOSED, ORDER_SERVED,
     *                ORDER_CANCELLED, ORDER_PAID)
     * @param orderId identifiant de la commande concernée
     */
    public void publishOrderEvent(String type, Long orderId) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/orders",
                    Map.of("type", type, "orderId", orderId));
            log.debug("WS → /topic/orders : {} (id={})", type, orderId);
        } catch (Exception e) {
            log.warn("Échec publication WS orders ({} id={}): {}", type, orderId, e.getMessage());
        }
    }

    /**
     * Notifie tous les abonnés /topic/tables qu'une table a changé.
     *
     * @param type    type d'événement (TABLE_CREATED, TABLE_UPDATED,
     *                TABLE_STATUS_UPDATED, TABLE_DELETED)
     * @param tableId identifiant de la table concernée
     */
    public void publishTableEvent(String type, Long tableId) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/tables",
                    Map.of("type", type, "tableId", tableId));
            log.debug("WS → /topic/tables : {} (id={})", type, tableId);
        } catch (Exception e) {
            log.warn("Échec publication WS tables ({} id={}): {}", type, tableId, e.getMessage());
        }
    }

    public void publishReservationEvent(String type, Long reservationId) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/reservations",
                    Map.of("type", type, "reservationId", reservationId));
            log.debug("WS → /topic/reservations : {} (id={})", type, reservationId);
        } catch (Exception e) {
            log.warn("Échec publication WS reservations ({} id={}): {}", type, reservationId, e.getMessage());
        }
    }

    /**
     * Notifie tous les abonnés /topic/products qu'un produit ou son stock a changé.
     *
     * @param type      type d'événement (PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_DELETED, STOCK_UPDATED)
     * @param productId identifiant du produit concerné
     */
    public void publishProductEvent(String type, Long productId) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/products",
                    Map.of("type", type, "productId", productId));
            log.debug("WS → /topic/products : {} (id={})", type, productId);
        } catch (Exception e) {
            log.warn("Échec publication WS products ({} id={}): {}", type, productId, e.getMessage());
        }
    }

    /**
     * Notifie tous les abonnés /topic/supplies qu'un approvisionnement a changé.
     *
     * @param type     type d'événement (SUPPLY_CREATED, SUPPLY_VALIDATED)
     * @param supplyId identifiant de l'approvisionnement concerné
     */
    public void publishSupplyEvent(String type, Long supplyId) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/supplies",
                    Map.of("type", type, "supplyId", supplyId));
            log.debug("WS → /topic/supplies : {} (id={})", type, supplyId);
        } catch (Exception e) {
            log.warn("Échec publication WS supplies ({} id={}): {}", type, supplyId, e.getMessage());
        }
    }

    /**
     * Notifie tous les abonnés /topic/users qu'un utilisateur ou employé a changé.
     *
     * @param type   type d'événement (USER_CREATED, USER_UPDATED, USER_DELETED, USER_ACTIVATED, USER_DEACTIVATED)
     * @param userId identifiant de l'utilisateur concerné (peut être null si inconnu)
     */
    public void publishUserEvent(String type, Long userId) {
        try {
            messagingTemplate.convertAndSend(
                    "/topic/users",
                    Map.of("type", type, "userId", userId != null ? userId : 0L));
            log.debug("WS → /topic/users : {} (id={})", type, userId);
        } catch (Exception e) {
            log.warn("Échec publication WS users ({} id={}): {}", type, userId, e.getMessage());
        }
    }
}
