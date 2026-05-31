package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.OrderItem;
import com.joel.gestion_snack.model.entity.OrderItemId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour l'entité OrderItem
 */
@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, OrderItemId> {
    List<OrderItem> findByOrder_OrderId(Long orderId);
    List<OrderItem> findByProduct_ProductId(Long productId);
}

