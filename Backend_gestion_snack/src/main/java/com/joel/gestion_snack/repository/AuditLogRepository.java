package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository pour l'entité AuditLog
 */
@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByTableName(String tableName);
    List<AuditLog> findByActionType(String actionType);
    List<AuditLog> findByPerformedBy(String performedBy);
}

