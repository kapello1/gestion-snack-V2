package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.config.WebSocketEventPublisher;
import com.joel.gestion_snack.model.dto.OrderDTO;
import com.joel.gestion_snack.model.dto.OrderItemDTO;
import com.joel.gestion_snack.model.dto.OrderItemRequestDTO;
import com.joel.gestion_snack.model.dto.OrderPaymentRequestDTO;
import com.joel.gestion_snack.model.dto.OrderRequestDTO;
import com.joel.gestion_snack.model.entity.*;
import com.joel.gestion_snack.repository.*;
import com.joel.gestion_snack.service.interfaces.IOrderService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des commandes
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class OrderServiceImpl implements IOrderService {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final DiningTableRepository diningTableRepository;
    private final RevenueRepository revenueRepository;
    private final TransactionRepository transactionRepository;
    private final MapperUtil mapperUtil;
    private final WebSocketEventPublisher wsPublisher;

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getAllOrders() {
        log.info("Récupération de toutes les commandes");
        List<Order> orders = orderRepository.findAll();
        log.debug("Nombre de commandes trouvées: {}", orders.size());
        return orders.stream()
                .map(this::toOrderDTOWithItems)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OrderDTO getOrderById(Long id) {
        log.info("Récupération de la commande avec l'ID: {}", id);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Commande non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Commande non trouvée avec l'ID: " + id);
                });
        return toOrderDTOWithItems(order);
    }

    @Override
    public OrderDTO createOrder(OrderRequestDTO requestDTO) {
        log.info("Création d'une nouvelle commande");

        Order order = new Order();
        order.setOrderType(requestDTO.getOrderType());
        order.setPaymentMethod(requestDTO.getPaymentMethod());
        order.setPickupTime(requestDTO.getPickupTime());
        order.setStatus(OrderStatus.ACTIVE);
        order.setOrderDate(LocalDate.now());
        order.setTotalAmount(BigDecimal.ZERO);
        order.setCreatedBy(requestDTO.getCreatedBy());
        order.setGuestCount(requestDTO.getGuestCount());

        // Associer la table si fournie — lock pessimiste pour éviter les accès concurrents
        if (requestDTO.getTableId() != null) {
            DiningTable table = diningTableRepository.findByIdForUpdate(requestDTO.getTableId())
                    .orElseThrow(() -> {
                        log.error("Table non trouvée avec l'ID: {}", requestDTO.getTableId());
                        return new EntityNotFoundException("Table non trouvée avec l'ID: " + requestDTO.getTableId());
                    });

            // Vérifier la capacité de la table
            if (requestDTO.getGuestCount() != null && requestDTO.getGuestCount() > 0) {
                Integer currentOccupied = orderRepository.sumGuestCountByTableIdAndStatus(table.getTableId(),
                        OrderStatus.ACTIVE);
                if (currentOccupied == null)
                    currentOccupied = 0;

                if (currentOccupied + requestDTO.getGuestCount() > table.getCapacity()) {
                    throw new IllegalArgumentException("Capacité de la table insuffisante. Places disponibles: "
                            + (table.getCapacity() - currentOccupied));
                }

                // Mettre à jour le statut de la table
                table.setStatus(TableStatusType.OCCUPIED);
            } else {
                table.setStatus(TableStatusType.OCCUPIED);
            }

            order.setTable(table);
            diningTableRepository.save(table);
        }

        // Associer le client si fourni
        if (requestDTO.getCustomerId() != null) {
            Customer customer = customerRepository.findById(requestDTO.getCustomerId())
                    .orElseThrow(() -> {
                        log.error("Client non trouvé avec l'ID: {}", requestDTO.getCustomerId());
                        return new EntityNotFoundException(
                                "Client non trouvé avec l'ID: " + requestDTO.getCustomerId());
                    });
            order.setCustomer(customer);
        }

        order = orderRepository.save(order);
        log.info("Commande créée avec l'ID: {}", order.getOrderId());

        // Créer les articles de commande
        for (OrderItemRequestDTO itemRequest : requestDTO.getOrderItems()) {
            Product product = productRepository.findById(itemRequest.getProductId())
                    .orElseThrow(() -> {
                        log.error("Produit non trouvé avec l'ID: {}", itemRequest.getProductId());
                        return new EntityNotFoundException(
                                "Produit non trouvé avec l'ID: " + itemRequest.getProductId());
                    });

            // Vérifier le stock
            if (product.getQuantityAvailable() < itemRequest.getQuantity()) {
                log.error("Stock insuffisant pour le produit {}: disponible={}, demandé={}",
                        product.getProductName(), product.getQuantityAvailable(), itemRequest.getQuantity());
                throw new IllegalArgumentException("Stock insuffisant pour le produit: " + product.getProductName());
            }

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setProduct(product);
            orderItem.setQuantity(itemRequest.getQuantity());
            orderItem.setUnitPrice(
                    itemRequest.getUnitPrice() != null ? itemRequest.getUnitPrice() : product.getUnitPrice());
            orderItem.setLineTotal(orderItem.getUnitPrice()
                    .multiply(BigDecimal.valueOf(orderItem.getQuantity())));
            orderItem.setCreatedBy(requestDTO.getCreatedBy());

            orderItemRepository.save(orderItem);
            log.debug("Article de commande créé: produit={}, quantité={}",
                    product.getProductName(), itemRequest.getQuantity());
        }

        // Le total sera recalculé automatiquement par le trigger de la base de données
        order = orderRepository.findById(order.getOrderId()).orElse(order);
        log.info("Commande créée avec succès avec l'ID: {}", order.getOrderId());
        wsPublisher.publishOrderEvent("ORDER_CREATED", order.getOrderId());
        return toOrderDTOWithItems(order);
    }

    @Override
    public OrderDTO updateOrder(Long id, OrderRequestDTO requestDTO) {
        log.info("Mise à jour de la commande avec l'ID: {}", id);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Commande non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Commande non trouvée avec l'ID: " + id);
                });

        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.CLOSED) {
            log.error("Impossible de modifier une commande {} ou {}", OrderStatus.CANCELLED, OrderStatus.CLOSED);
            throw new IllegalStateException("Impossible de modifier une commande annulée ou fermée");
        }

        // Mettre à jour les informations de base
        if (requestDTO.getTableId() != null) {
            DiningTable table = diningTableRepository.findById(requestDTO.getTableId())
                    .orElseThrow(() -> new EntityNotFoundException("Table non trouvée"));
            order.setTable(table);
        }

        if (requestDTO.getCustomerId() != null) {
            Customer customer = customerRepository.findById(requestDTO.getCustomerId())
                    .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));
            order.setCustomer(customer);
        }

        order.setOrderType(requestDTO.getOrderType());
        order.setPaymentMethod(requestDTO.getPaymentMethod());
        order.setPickupTime(requestDTO.getPickupTime());
        order.setUpdatedBy(requestDTO.getCreatedBy());

        order = orderRepository.save(order);
        log.info("Commande mise à jour avec succès avec l'ID: {}", order.getOrderId());
        return toOrderDTOWithItems(order);
    }

    @Override
    public void deleteOrder(Long id) {
        log.info("Suppression de la commande avec l'ID: {}", id);
        if (!orderRepository.existsById(id)) {
            log.error("Commande non trouvée avec l'ID: {}", id);
            throw new EntityNotFoundException("Commande non trouvée avec l'ID: " + id);
        }
        orderRepository.deleteById(id);
        log.info("Commande supprimée avec succès avec l'ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByStatus(OrderStatus status) {
        log.info("Récupération des commandes avec le statut: {}", status);
        List<Order> orders = orderRepository.findByStatus(status);
        log.debug("Nombre de commandes trouvées: {}", orders.size());
        return orders.stream()
                .map(this::toOrderDTOWithItems)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByType(OrderType orderType) {
        log.info("Récupération des commandes de type: {}", orderType);
        List<Order> orders = orderRepository.findByOrderType(orderType);
        log.debug("Nombre de commandes trouvées: {}", orders.size());
        return orders.stream()
                .map(this::toOrderDTOWithItems)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByDate(LocalDate date) {
        log.info("Récupération des commandes de la date: {}", date);
        List<Order> orders = orderRepository.findByOrderDate(date);
        log.debug("Nombre de commandes trouvées: {}", orders.size());
        return orders.stream()
                .map(this::toOrderDTOWithItems)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByCustomer(Long customerId) {
        log.info("Récupération des commandes du client avec l'ID: {}", customerId);
        List<Order> orders = orderRepository.findByCustomer_CustomerId(customerId);
        log.debug("Nombre de commandes trouvées: {}", orders.size());
        return orders.stream()
                .map(this::toOrderDTOWithItems)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByStatusAndDate(OrderStatus status, LocalDate orderDate) {
        log.info("Récupération des commandes avec le statut: {} et la date: {}", status, orderDate);
        List<Order> orders = orderRepository.findByStatusAndOrderDate(status, orderDate);
        log.debug("Nombre de commandes trouvées: {}", orders.size());
        return orders.stream()
                .map(this::toOrderDTOWithItems)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OrderDTO> getOrdersByCustomerAndDate(Long customerId, LocalDate orderDate) {
        log.info("Récupération des commandes du client ID: {} et la date: {}", customerId, orderDate);
        List<Order> orders = orderRepository.findByCustomer_CustomerIdAndOrderDate(customerId, orderDate);
        log.debug("Nombre de commandes trouvées: {}", orders.size());
        return orders.stream()
                .map(this::toOrderDTOWithItems)
                .collect(Collectors.toList());
    }

    @Override
    public OrderDTO cancelOrder(Long id) {
        log.info("Annulation de la commande avec l'ID: {}", id);
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Commande non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Commande non trouvée avec l'ID: " + id);
                });

        if (order.getStatus() == OrderStatus.CANCELLED) {
            log.warn("La commande {} est déjà annulée", id);
            return toOrderDTOWithItems(order);
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setUpdatedBy("SYSTEM");
        order = orderRepository.save(order);

        // Le trigger de la base de données restaurera automatiquement le stock
        log.info("Commande annulée avec succès avec l'ID: {}", id);
        wsPublisher.publishOrderEvent("ORDER_CANCELLED", order.getOrderId());
        return toOrderDTOWithItems(order);
    }

    @Override
    public OrderDTO closeOrder(Long id) {
        log.info("Fermeture de la commande avec l'ID: {}", id);
        Order order = findOrderOrThrow(id);

        if (order.getStatus() == OrderStatus.CLOSED) {
            log.warn("La commande {} est déjà prête", id);
            return toOrderDTOWithItems(order);
        }

        if (order.getStatus() != OrderStatus.ACTIVE) {
            throw new IllegalStateException(
                    "Seule une commande active peut être marquée comme prête (statut actuel: " + order.getStatus() + ")");
        }

        order.setStatus(OrderStatus.CLOSED);
        order.setUpdatedBy("COOK");
        order = orderRepository.save(order);

        log.info("Commande marquée prête avec succès, ID: {}", id);
        wsPublisher.publishOrderEvent("ORDER_CLOSED", order.getOrderId());
        return toOrderDTOWithItems(order);
    }

    @Override
    public OrderDTO serveOrder(Long id) {
        log.info("Marquage de la commande comme servie avec l'ID: {}", id);
        Order order = findOrderOrThrow(id);

        if (order.getStatus() == OrderStatus.SERVED) {
            log.warn("La commande {} est déjà servie", id);
            return toOrderDTOWithItems(order);
        }

        if (order.getStatus() != OrderStatus.CLOSED) {
            throw new IllegalStateException(
                    "Seule une commande prête peut être servie (statut actuel: " + order.getStatus() + ")");
        }

        order.setStatus(OrderStatus.SERVED);
        order.setUpdatedBy("WAITER");
        order = orderRepository.save(order);

        log.info("Commande marquée comme servie avec succès, ID: {}", id);
        wsPublisher.publishOrderEvent("ORDER_SERVED", order.getOrderId());
        return toOrderDTOWithItems(order);
    }

    @Override
    public OrderDTO payOrder(Long id, OrderPaymentRequestDTO requestDTO) {
        log.info("Paiement de la commande avec l'ID: {}", id);
        Order order = findOrderOrThrow(id);

        if (transactionRepository.existsByOrder_OrderIdAndStatus(id, TransactionStatusType.COMPLETED)) {
            log.warn("La commande {} est déjà payée", id);
            return toOrderDTOWithItems(order);
        }

        validateOrderReadyForPayment(order);

        order.setPaymentMethod(requestDTO.getPaymentMethod());
        order.setUpdatedBy(requestDTO.getCreatedBy() != null ? requestDTO.getCreatedBy() : "CASHIER");
        order = orderRepository.save(order);

        Transaction transaction = new Transaction();
        transaction.setOrder(order);
        if (order.getCustomer() != null) {
            transaction.setCustomer(order.getCustomer());
        }
        transaction.setPaymentMethod(requestDTO.getPaymentMethod());
        transaction.setAmount(order.getTotalAmount());
        transaction.setStatus(TransactionStatusType.COMPLETED);
        transaction.setCreatedBy(order.getUpdatedBy());
        transactionRepository.save(transaction);

        freeTableIfNeeded(order);
        updateRevenue(order);

        log.info("Paiement enregistré pour la commande {}", id);
        wsPublisher.publishOrderEvent("ORDER_PAID", order.getOrderId());
        // Si une table a été libérée, notifier aussi le topic tables
        if (order.getTable() != null) {
            wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", order.getTable().getTableId());
        }
        return toOrderDTOWithItems(order);
    }

    private Order findOrderOrThrow(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Commande non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Commande non trouvée avec l'ID: " + id);
                });
    }

    private void validateOrderReadyForPayment(Order order) {
        if (order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalStateException("Impossible de payer une commande annulée");
        }

        if (order.getOrderType() == OrderType.TAKEAWAY) {
            if (order.getStatus() != OrderStatus.CLOSED && order.getStatus() != OrderStatus.SERVED) {
                throw new IllegalStateException(
                        "Une commande à emporter doit être prête avant le paiement (statut actuel: "
                                + order.getStatus() + ")");
            }
            return;
        }

        if (order.getStatus() != OrderStatus.SERVED) {
            throw new IllegalStateException(
                    "Une commande sur place doit être servie avant le paiement (statut actuel: "
                            + order.getStatus() + ")");
        }
    }

    private void freeTableIfNeeded(Order order) {
        if (order.getTable() == null) {
            return;
        }
        DiningTable table = order.getTable();
        table.setStatus(TableStatusType.FREE);
        table.setUpdatedBy(order.getUpdatedBy());
        diningTableRepository.save(table);
    }

    /**
     * Met à jour le chiffre d'affaires quotidien
     */
    private void updateRevenue(Order order) {
        try {
            LocalDate today = order.getOrderDate() != null ? order.getOrderDate() : LocalDate.now();
            Revenue revenue = revenueRepository.findByDate(today)
                    .orElse(new Revenue());

            if (revenue.getRevenueId() == null) {
                revenue.setDate(today);
                revenue.setAmount(BigDecimal.ZERO);
                revenue.setOrderCount(0);
                revenue.setCreatedBy("SYSTEM");
            }

            revenue.setAmount(revenue.getAmount().add(order.getTotalAmount()));
            revenue.setOrderCount(revenue.getOrderCount() + 1);
            revenue.setUpdatedBy("SYSTEM");
            revenue.setUpdatedAt(java.time.LocalDateTime.now());

            revenueRepository.save(revenue);
            log.info("Chiffre d'affaires mis à jour: {} € pour la date {}", revenue.getAmount(), today);
        } catch (Exception e) {
            log.error("Erreur lors de la mise à jour du chiffre d'affaires", e);
            // Ne pas bloquer la fermeture de la commande si la mise à jour du CA échoue
        }
    }

    /**
     * Convertit une commande en DTO avec ses articles
     */
    private OrderDTO toOrderDTOWithItems(Order order) {
        OrderDTO dto = mapperUtil.toOrderDTO(order);
        List<OrderItem> items = orderItemRepository.findByOrder_OrderId(order.getOrderId());
        List<OrderItemDTO> itemDTOs = items.stream()
                .map(mapperUtil::toOrderItemDTO)
                .collect(Collectors.toList());
        dto.setOrderItems(itemDTOs);
        dto.setPaymentCompleted(
                transactionRepository.existsByOrder_OrderIdAndStatus(
                        order.getOrderId(), TransactionStatusType.COMPLETED));
        return dto;
    }
}
