package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.DessertDTO;
import com.joel.gestion_snack.service.implementations.DessertServiceImpl;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/desserts")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Desserts", description = "API pour la gestion des desserts")
public class DessertControllerImpl {

    private final DessertServiceImpl dessertService;

    @GetMapping
    @Operation(summary = "Récupérer tous les desserts")
    public ResponseEntity<List<DessertDTO>> getAllDesserts() {
        return ResponseEntity.ok(dessertService.getAllDesserts());
    }

    @GetMapping("/available")
    @Operation(summary = "Récupérer les desserts disponibles")
    public ResponseEntity<List<DessertDTO>> getAvailableDesserts() {
        return ResponseEntity.ok(dessertService.getAvailableDesserts());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un dessert par ID")
    public ResponseEntity<DessertDTO> getDessertById(@PathVariable Long id) {
        return ResponseEntity.ok(dessertService.getDessertById(id));
    }

    @PostMapping
    @Operation(summary = "Créer un dessert")
    public ResponseEntity<DessertDTO> createDessert(@RequestBody DessertDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(dessertService.createDessert(dto));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Modifier un dessert")
    public ResponseEntity<DessertDTO> updateDessert(@PathVariable Long id, @RequestBody DessertDTO dto) {
        return ResponseEntity.ok(dessertService.updateDessert(id, dto));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un dessert")
    public ResponseEntity<Void> deleteDessert(@PathVariable Long id) {
        dessertService.deleteDessert(id);
        return ResponseEntity.noContent().build();
    }
}
