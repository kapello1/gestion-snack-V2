package com.joel.gestion_snack.controller.implementations;

import org.springframework.security.access.prepost.PreAuthorize;
import com.joel.gestion_snack.model.dto.DiningTableDTO;
import com.joel.gestion_snack.model.dto.DiningTableRequestDTO;
import com.joel.gestion_snack.model.entity.TableStatusType;
import com.joel.gestion_snack.service.interfaces.IDiningTableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Implémentation du contrôleur pour la gestion des tables
 */
@RestController
@RequestMapping("/api/tables")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Tables", description = "API pour la gestion des tables")
public class DiningTableControllerImpl {
    
    private final IDiningTableService diningTableService;
    
    @GetMapping
    @Operation(summary = "Récupérer toutes les tables")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DiningTableDTO>> getAllTables() {
        log.info("Requête GET pour récupérer toutes les tables");
        return ResponseEntity.ok(diningTableService.getAllTables());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une table par son ID")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DiningTableDTO> getTableById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer la table avec l'ID: {}", id);
        return ResponseEntity.ok(diningTableService.getTableById(id));
    }
    
    @PostMapping
    @Operation(summary = "Créer une nouvelle table")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DiningTableDTO> createTable(@Valid @RequestBody DiningTableRequestDTO requestDTO) {
        log.info("Requête POST pour créer une nouvelle table");
        DiningTableDTO table = diningTableService.createTable(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(table);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour une table")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DiningTableDTO> updateTable(@PathVariable Long id, 
                                                       @Valid @RequestBody DiningTableRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour la table avec l'ID: {}", id);
        return ResponseEntity.ok(diningTableService.updateTable(id, requestDTO));
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une table")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTable(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer la table avec l'ID: {}", id);
        diningTableService.deleteTable(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Récupérer les tables par statut")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<DiningTableDTO>> getTablesByStatus(@PathVariable TableStatusType status) {
        log.info("Requête GET pour récupérer les tables avec le statut: {}", status);
        return ResponseEntity.ok(diningTableService.getTablesByStatus(status));
    }
    
    @PutMapping("/{id}/status")
    @Operation(summary = "Changer le statut d'une table")
    @PreAuthorize("hasAnyRole('ADMIN','WAITER','CUSTOMER')")
    public ResponseEntity<DiningTableDTO> updateTableStatus(@PathVariable Long id,
                                                             @RequestParam TableStatusType status) {
        log.info("Requête PUT pour changer le statut de la table {} vers {}", id, status);
        return ResponseEntity.ok(diningTableService.updateTableStatus(id, status));
    }

    @PostMapping("/{id}/release")
    @Operation(summary = "Libérer une table (vérifie l'état des commandes et clôture les réservations)")
    @PreAuthorize("hasAnyRole('ADMIN','WAITER')")
    public ResponseEntity<DiningTableDTO> releaseTable(@PathVariable Long id) {
        log.info("Requête POST pour libérer la table avec l'ID: {}", id);
        return ResponseEntity.ok(diningTableService.releaseTable(id));
    }
}

