package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.StockAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour l'entité StockAlert
 */
@Repository
public interface StockAlertRepository extends JpaRepository<StockAlert, Long> {
    List<StockAlert> findByResolved(Boolean resolved);
    List<StockAlert> findByProduct_ProductId(Long productId);
}

