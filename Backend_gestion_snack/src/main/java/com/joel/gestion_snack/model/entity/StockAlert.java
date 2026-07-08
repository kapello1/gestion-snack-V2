package com.joel.gestion_snack.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entité représentant une alerte de stock
 */
@Entity
@Table(name = "stock_alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockAlert {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "alert_id")
    private Long alertId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    
    @Column(name = "message", nullable = false, columnDefinition = "TEXT")
    private String message;
    
    @CreationTimestamp
    @Column(name = "alert_date", nullable = false, updatable = false)
    private LocalDateTime alertDate;
    
    @Column(name = "resolved", nullable = false)
    private Boolean resolved = false;

    /** Quantité souhaitée saisie manuellement par le cuisinier (null pour les alertes automatiques) */
    @Column(name = "requested_quantity")
    private Integer requestedQuantity;

    /** Qui a déclenché l'alerte : 'SYSTEM' (seuil automatique) ou 'COOK' (déclenchement manuel) */
    @Column(name = "triggered_by", length = 20)
    private String triggeredBy = "SYSTEM";
}

