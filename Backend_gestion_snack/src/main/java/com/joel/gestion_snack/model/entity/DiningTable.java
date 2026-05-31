package com.joel.gestion_snack.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Entité représentant une table de restaurant
 */
@Entity
@Table(name = "tables_snack")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DiningTable {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "table_id")
    private Long tableId;

    @Column(name = "order_id")
    private Long orderId;
    
    @Column(name = "table_number", nullable = false, unique = true)
    private Integer tableNumber;
    
    @Column(name = "capacity", nullable = false)
    private Integer capacity;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TableStatusType status = TableStatusType.FREE;
    
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

