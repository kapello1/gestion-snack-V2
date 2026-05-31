package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.ViandeDTO;
import com.joel.gestion_snack.service.implementations.ViandeServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/viandes")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Viandes", description = "API pour la gestion des viandes")
public class ViandeControllerImpl {

    private final ViandeServiceImpl viandeService;

    @GetMapping
    @Operation(summary = "Récupérer toutes les viandes")
    public ResponseEntity<List<ViandeDTO>> getAllViandes() {
        return ResponseEntity.ok(viandeService.getAllViandes());
    }

    @GetMapping("/available")
    @Operation(summary = "Récupérer les viandes disponibles")
    public ResponseEntity<List<ViandeDTO>> getAvailableViandes() {
        return ResponseEntity.ok(viandeService.getAvailableViandes());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une viande par ID")
    public ResponseEntity<ViandeDTO> getViandeById(@PathVariable Long id) {
        return ResponseEntity.ok(viandeService.getViandeById(id));
    }

    @PostMapping
    @Operation(summary = "Créer une viande")
    public ResponseEntity<ViandeDTO> createViande(@RequestBody ViandeDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(viandeService.createViande(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier une viande")
    public ResponseEntity<ViandeDTO> updateViande(@PathVariable Long id, @RequestBody ViandeDTO dto) {
        return ResponseEntity.ok(viandeService.updateViande(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une viande")
    public ResponseEntity<Void> deleteViande(@PathVariable Long id) {
        viandeService.deleteViande(id);
        return ResponseEntity.noContent().build();
    }
}
