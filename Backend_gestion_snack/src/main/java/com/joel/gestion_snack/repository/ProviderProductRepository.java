package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.ProviderProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour l'entité ProviderProduct
 */
@Repository
public interface ProviderProductRepository extends JpaRepository<ProviderProduct, Long> {
    List<ProviderProduct> findByProvider_ProviderId(Long providerId);
    List<ProviderProduct> findByProduct_ProductId(Long productId);
}

