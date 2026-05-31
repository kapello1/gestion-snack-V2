package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Product;
import com.joel.gestion_snack.model.entity.ProductType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository pour l'entité Product
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByProductName(String productName);
    List<Product> findByProductType(ProductType productType);
    List<Product> findByQuantityAvailableLessThanEqual(Integer threshold);
}

