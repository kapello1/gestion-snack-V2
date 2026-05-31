package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour l'entité Review
 */
@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByCustomer_CustomerId(Long customerId);
    List<Review> findByProduct_ProductId(Long productId);
}

