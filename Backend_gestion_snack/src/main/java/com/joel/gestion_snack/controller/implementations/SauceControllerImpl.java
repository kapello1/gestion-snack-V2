package com.joel.gestion_snack.controller.implementations;

import org.springframework.security.access.prepost.PreAuthorize;
import com.joel.gestion_snack.model.dto.SauceDTO;
import com.joel.gestion_snack.service.implementations.SauceServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sauces")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Sauces", description = "API pour la gestion des sauces")
public class SauceControllerImpl {

    private final SauceServiceImpl sauceService;

    @GetMapping
    @Operation(summary = "Récupérer toutes les sauces")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SauceDTO>> getAllSauces() {
        return ResponseEntity.ok(sauceService.getAllSauces());
    }

    @GetMapping("/available")
    @Operation(summary = "Récupérer les sauces disponibles")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SauceDTO>> getAvailableSauces() {
        return ResponseEntity.ok(sauceService.getAvailableSauces());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une sauce par ID")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SauceDTO> getSauceById(@PathVariable Long id) {
        return ResponseEntity.ok(sauceService.getSauceById(id));
    }

    @PostMapping
    @Operation(summary = "Créer une sauce")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SauceDTO> createSauce(@RequestBody SauceDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sauceService.createSauce(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une sauce")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SauceDTO> updateSauce(@PathVariable Long id, @RequestBody SauceDTO dto) {
        return ResponseEntity.ok(sauceService.updateSauce(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une sauce")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteSauce(@PathVariable Long id) {
        sauceService.deleteSauce(id);
        return ResponseEntity.noContent().build();
    }
}
