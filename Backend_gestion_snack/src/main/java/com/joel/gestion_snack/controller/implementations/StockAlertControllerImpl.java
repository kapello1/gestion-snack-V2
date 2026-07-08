package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.StockAlertDTO;
import com.joel.gestion_snack.service.interfaces.IStockAlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

/**
 * Implémentation du contrôleur pour la gestion des alertes de stock
 */
@RestController
@RequestMapping("/api/stock-alerts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Alertes de Stock", description = "API pour la gestion des alertes de stock")
public class StockAlertControllerImpl {
    
    private final IStockAlertService stockAlertService;
    
    @GetMapping
    @Operation(summary = "Récupérer toutes les alertes de stock")
    public ResponseEntity<List<StockAlertDTO>> getAllAlerts() {
        log.info("Requête GET pour récupérer toutes les alertes de stock");
        return ResponseEntity.ok(stockAlertService.getAllAlerts());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une alerte par son ID")
    public ResponseEntity<StockAlertDTO> getAlertById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer l'alerte avec l'ID: {}", id);
        return ResponseEntity.ok(stockAlertService.getAlertById(id));
    }
    
    @GetMapping("/unresolved")
    @Operation(summary = "Récupérer les alertes non résolues")
    public ResponseEntity<List<StockAlertDTO>> getUnresolvedAlerts() {
        log.info("Requête GET pour récupérer les alertes non résolues");
        return ResponseEntity.ok(stockAlertService.getUnresolvedAlerts());
    }
    
    @PostMapping("/{id}/resolve")
    @Operation(summary = "Résoudre une alerte")
    public ResponseEntity<StockAlertDTO> resolveAlert(@PathVariable Long id) {
        log.info("Requête POST pour résoudre l'alerte avec l'ID: {}", id);
        return ResponseEntity.ok(stockAlertService.resolveAlert(id));
    }
    
    @GetMapping("/product/{productId}")
    @Operation(summary = "Récupérer les alertes d'un produit")
    public ResponseEntity<List<StockAlertDTO>> getAlertsByProduct(@PathVariable Long productId) {
        log.info("Requête GET pour récupérer les alertes du produit avec l'ID: {}", productId);
        return ResponseEntity.ok(stockAlertService.getAlertsByProduct(productId));
    }

    @PostMapping
    @Operation(summary = "Créer une alerte manuelle (cuisinier)")
    public ResponseEntity<?> createManualAlert(@RequestBody Map<String, Object> body) {
        Long productId         = body.get("productId") != null ? Long.valueOf(body.get("productId").toString()) : null;
        Integer requestedQty   = body.get("requestedQuantity") != null ? Integer.valueOf(body.get("requestedQuantity").toString()) : null;
        String message         = body.get("message") != null ? body.get("message").toString() : null;
        String triggeredBy     = body.get("triggeredBy") != null ? body.get("triggeredBy").toString() : "COOK";

        if (productId == null || requestedQty == null || requestedQty <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "productId et requestedQuantity (> 0) sont obligatoires"));
        }
        log.info("Alerte manuelle — produit {} qté {} par {}", productId, requestedQty, triggeredBy);
        StockAlertDTO alert = stockAlertService.createManualAlert(productId, requestedQty, message, triggeredBy);
        return ResponseEntity.status(HttpStatus.CREATED).body(alert);
    }
}

