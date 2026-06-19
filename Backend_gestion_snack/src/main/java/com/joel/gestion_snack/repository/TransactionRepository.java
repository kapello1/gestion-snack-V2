package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Transaction;
import com.joel.gestion_snack.model.entity.TransactionStatusType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    boolean existsByOrder_OrderIdAndStatus(Long orderId, TransactionStatusType status);

    Optional<Transaction> findFirstByOrder_OrderIdAndStatus(Long orderId, TransactionStatusType status);

    Optional<Transaction> findByStripePaymentIntentId(String stripePaymentIntentId);
}
