package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.OrderDTO;
import com.joel.gestion_snack.model.dto.OrderPaymentRequestDTO;
import com.joel.gestion_snack.model.dto.OrderRequestDTO;
import com.joel.gestion_snack.model.entity.OrderStatus;
import com.joel.gestion_snack.model.entity.OrderType;

import java.time.LocalDate;
import java.util.List;

/**
 * Interface du service pour la gestion des commandes
 */
public interface IOrderService {
    /**
     * Récupère toutes les commandes
     * 
     * @return Liste de toutes les commandes
     */
    List<OrderDTO> getAllOrders();

    /**
     * Récupère une commande par son ID
     * 
     * @param id ID de la commande
     * @return DTO de la commande
     */
    OrderDTO getOrderById(Long id);

    /**
     * Crée une nouvelle commande
     * 
     * @param requestDTO DTO de requête pour créer une commande
     * @return DTO de la commande créée
     */
    OrderDTO createOrder(OrderRequestDTO requestDTO);

    /**
     * Met à jour une commande existante
     * 
     * @param id         ID de la commande à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour une commande
     * @return DTO de la commande mise à jour
     */
    OrderDTO updateOrder(Long id, OrderRequestDTO requestDTO);

    /**
     * Supprime une commande par son ID
     * 
     * @param id ID de la commande à supprimer
     */
    void deleteOrder(Long id);

    /**
     * Récupère les commandes par statut
     * 
     * @param status Statut de la commande
     * @return Liste des commandes avec le statut spécifié
     */
    List<OrderDTO> getOrdersByStatus(OrderStatus status);

    /**
     * Récupère les commandes par type
     * 
     * @param orderType Type de commande
     * @return Liste des commandes du type spécifié
     */
    List<OrderDTO> getOrdersByType(OrderType orderType);

    /**
     * Récupère les commandes par date
     * 
     * @param date Date de la commande
     * @return Liste des commandes de la date spécifiée
     */
    List<OrderDTO> getOrdersByDate(LocalDate date);

    /**
     * Récupère les commandes d'un client
     * 
     * @param customerId ID du client
     * @return Liste des commandes du client
     */
    List<OrderDTO> getOrdersByCustomer(Long customerId);

    /**
     * Récupère les commandes par statut et date
     * 
     * @param status    Statut de la commande
     * @param orderDate Date de la commande
     * @return Liste des commandes avec le statut et la date spécifiés
     */
    List<OrderDTO> getOrdersByStatusAndDate(OrderStatus status, LocalDate orderDate);

    /**
     * Récupère les commandes d'un client par date
     * 
     * @param customerId ID du client
     * @param orderDate  Date de la commande
     * @return Liste des commandes du client à la date spécifiée
     */
    List<OrderDTO> getOrdersByCustomerAndDate(Long customerId, LocalDate orderDate);

    /**
     * Annule une commande
     * 
     * @param id ID de la commande à annuler
     * @return DTO de la commande annulée
     */
    OrderDTO cancelOrder(Long id);

    /**
     * Ferme une commande
     * 
     * @param id ID de la commande à fermer
     * @return DTO de la commande fermée
     */
    OrderDTO closeOrder(Long id);

    /**
     * Marque une commande comme servie
     * 
     * @param id ID de la commande à marquer comme servie
     * @return DTO de la commande servie
     */
    OrderDTO serveOrder(Long id);

    /**
     * Enregistre le paiement d'une commande (caisse ou client)
     */
    OrderDTO payOrder(Long id, OrderPaymentRequestDTO requestDTO);

    /**
     * Rembourse une commande payée par Stripe.
     * Appelle l'API Stripe en premier, puis met à jour la transaction en REFUNDED.
     */
    OrderDTO refundOrder(Long orderId, String refundedBy);
}
