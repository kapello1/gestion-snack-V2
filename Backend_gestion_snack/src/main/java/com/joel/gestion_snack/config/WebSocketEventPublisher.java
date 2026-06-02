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
}
