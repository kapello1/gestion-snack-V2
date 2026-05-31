package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Order;
import com.joel.gestion_snack.model.entity.OrderStatus;
import com.joel.gestion_snack.model.entity.OrderType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Repository pour l'entité Order
 */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatus(OrderStatus status);

    List<Order> findByOrderType(OrderType orderType);

    List<Order> findByOrderDate(LocalDate orderDate);

    List<Order> findByCustomer_CustomerId(Long customerId);

    List<Order> findByStatusAndOrderDate(OrderStatus status, LocalDate orderDate);

    List<Order> findByCustomer_CustomerIdAndOrderDate(Long customerId, LocalDate orderDate);

    List<Order> findByTable_TableId(Long tableId);

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(SUM(o.guestCount), 0) FROM Order o WHERE o.table.tableId = :tableId AND o.status = :status")
    Integer sumGuestCountByTableIdAndStatus(
            @org.springframework.data.repository.query.Param("tableId") Long tableId,
            @org.springframework.data.repository.query.Param("status") OrderStatus status);
}
