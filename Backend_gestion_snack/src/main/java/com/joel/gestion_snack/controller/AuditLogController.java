package com.joel.gestion_snack.controller;

import com.joel.gestion_snack.model.entity.AuditLog;
import com.joel.gestion_snack.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<List<AuditLog>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return ResponseEntity.ok(
            auditLogRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "performedAt"))
            ).getContent()
        );
    }

    @GetMapping("/table/{tableName}")
    public ResponseEntity<List<AuditLog>> getByTable(@PathVariable String tableName) {
        return ResponseEntity.ok(auditLogRepository.findByTableName(tableName));
    }

    @GetMapping("/action/{actionType}")
    public ResponseEntity<List<AuditLog>> getByAction(@PathVariable String actionType) {
        return ResponseEntity.ok(auditLogRepository.findByActionType(actionType));
    }

    @GetMapping("/user/{username}")
    public ResponseEntity<List<AuditLog>> getByUser(@PathVariable String username) {
        return ResponseEntity.ok(auditLogRepository.findByPerformedBy(username));
    }
}
