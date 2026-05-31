package com.joel.gestion_snack.model.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Entité représentant un log d'audit
 */
@Entity
@Table(name = "audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id")
    private Long logId;
    
    @Column(name = "table_name", nullable = false, length = 50)
    private String tableName;
    
    @Column(name = "action_type", nullable = false, length = 10)
    private String actionType;
    
    @Column(name = "record_id", nullable = false, columnDefinition = "TEXT")
    private String recordId;
    
    @Column(name = "performed_by", length = 100)
    private String performedBy;
    
    @CreationTimestamp
    @Column(name = "performed_at", nullable = false, updatable = false)
    private LocalDateTime performedAt;
    
    @Column(name = "details", columnDefinition = "TEXT")
    private String details;
}

