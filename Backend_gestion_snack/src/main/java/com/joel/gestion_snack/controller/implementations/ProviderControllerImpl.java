package com.joel.gestion_snack.controller.implementations;

import org.springframework.security.access.prepost.PreAuthorize;
import com.joel.gestion_snack.model.dto.*;
import com.joel.gestion_snack.service.interfaces.IProviderService;
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
 * Implémentation du contrôleur pour la gestion des fournisseurs
 */
@RestController
@RequestMapping("/api/providers")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Fournisseurs", description = "API pour la gestion des fournisseurs")
public class ProviderControllerImpl {

    private final IProviderService providerService;

    @GetMapping
    @Operation(summary = "Récupérer tous les fournisseurs")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProviderDTO>> getAllProviders() {
        log.info("Requête GET pour récupérer tous les fournisseurs");
        return ResponseEntity.ok(providerService.getAllProviders());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un fournisseur par son ID")
    @PreAuthorize("hasRole('ADMIN') or @authz.isProvider(authentication, #id)")
    public ResponseEntity<ProviderDTO> getProviderById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer le fournisseur avec l'ID: {}", id);
        return ResponseEntity.ok(providerService.getProviderById(id));
    }

    @PostMapping
    @Operation(summary = "Créer un nouveau fournisseur")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProviderDTO> createProvider(@Valid @RequestBody ProviderRequestDTO requestDTO) {
        log.info("Requête POST pour créer un nouveau fournisseur");
        ProviderDTO provider = providerService.createProvider(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(provider);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un fournisseur")
    @PreAuthorize("hasRole('ADMIN') or @authz.isProvider(authentication, #id)")
    public ResponseEntity<ProviderDTO> updateProvider(@PathVariable Long id,
            @Valid @RequestBody ProviderRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour le fournisseur avec l'ID: {}", id);
        return ResponseEntity.ok(providerService.updateProvider(id, requestDTO));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un fournisseur")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteProvider(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer le fournisseur avec l'ID: {}", id);
        providerService.deleteProvider(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/supplies")
    @Operation(summary = "Enregistrer une fourniture de produit")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProviderProductDTO> recordSupply(@Valid @RequestBody ProviderProductRequestDTO requestDTO) {
        log.info("Requête POST pour enregistrer une fourniture");
        ProviderProductDTO supply = providerService.recordSupply(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(supply);
    }

    @PostMapping("/supplies/{id}/validate")
    @Operation(summary = "Valider une fourniture et mettre à jour le stock")
    @PreAuthorize("hasRole('ADMIN') or @authz.ownsSupply(authentication, #id)")
    public ResponseEntity<ProviderProductDTO> validateSupply(@PathVariable Long id) {
        log.info("Requête POST pour valider la fourniture avec l'ID: {}", id);
        return ResponseEntity.ok(providerService.validateSupply(id));
    }

    @GetMapping("/supplies")
    @Operation(summary = "Récupérer toutes les fournitures")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProviderProductDTO>> getAllSupplies() {
        log.info("Requête GET pour récupérer toutes les fournitures");
        return ResponseEntity.ok(providerService.getAllSupplies());
    }

    @GetMapping("/{providerId}/supplies")
    @Operation(summary = "Récupérer les fournitures d'un fournisseur")
    @PreAuthorize("hasRole('ADMIN') or @authz.isProvider(authentication, #providerId)")
    public ResponseEntity<List<ProviderProductDTO>> getSuppliesByProvider(@PathVariable Long providerId) {
        log.info("Requête GET pour récupérer les fournitures du fournisseur avec l'ID: {}", providerId);
        return ResponseEntity.ok(providerService.getSuppliesByProvider(providerId));
    }
}
