package com.joel.gestion_snack.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Entité représentant un produit
 */
@Entity
@Table(name = "products")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Product {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "product_id")
    private Long productId;
    
    @Column(name = "product_name", nullable = false, unique = true, length = 100)
    private String productName;
    
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal unitPrice;
    
    @Column(name = "quantity_available", nullable = false)
    private Integer quantityAvailable = 0;
    
    @Column(name = "alert_threshold", nullable = false)
    private Integer alertThreshold = 0;
    
    @Column(name = "category_id")
    private Long categoryId;
    
    @Column(name = "stock_id")
    private Long stockId;
    
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
    
    @Column(name = "alergy", columnDefinition = "TEXT")
    private String alergy;
    
    @Column(name = "image_url")
    private String imageUrl;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "product_type", nullable = false)
    private ProductType productType = ProductType.DRINK;

    @Column(name = "needs_sauce")
    private Boolean needsSauce = false;

    @Column(name = "needs_viande")
    private Boolean needsViande = false;
    
    @Column(name = "created_by", length = 50)
    private String createdBy;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_by", length = 50)
    private String updatedBy;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}

