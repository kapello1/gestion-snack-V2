package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO pour l'entité AuditLog
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogDTO {
    private Long logId;
    private String tableName;
    private String actionType;
    private String recordId;
    private String performedBy;
    private LocalDateTime performedAt;
    private String details;
}

