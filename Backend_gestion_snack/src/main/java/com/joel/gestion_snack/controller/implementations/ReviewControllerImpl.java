package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.ReviewDTO;
import com.joel.gestion_snack.model.dto.ReviewRequestDTO;
import com.joel.gestion_snack.service.interfaces.IReviewService;
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
 * Implémentation du contrôleur pour la gestion des avis
 */
@RestController
@RequestMapping("/api/reviews")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Avis", description = "API pour la gestion des avis clients")
public class ReviewControllerImpl {
    
    private final IReviewService reviewService;
    
    @GetMapping
    @Operation(summary = "Récupérer tous les avis")
    public ResponseEntity<List<ReviewDTO>> getAllReviews() {
        log.info("Requête GET pour récupérer tous les avis");
        return ResponseEntity.ok(reviewService.getAllReviews());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un avis par son ID")
    public ResponseEntity<ReviewDTO> getReviewById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer l'avis avec l'ID: {}", id);
        return ResponseEntity.ok(reviewService.getReviewById(id));
    }
    
    @PostMapping
    @Operation(summary = "Créer un nouvel avis")
    public ResponseEntity<ReviewDTO> createReview(@Valid @RequestBody ReviewRequestDTO requestDTO) {
        log.info("Requête POST pour créer un nouvel avis");
        ReviewDTO review = reviewService.createReview(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(review);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un avis")
    public ResponseEntity<ReviewDTO> updateReview(@PathVariable Long id, 
                                                    @Valid @RequestBody ReviewRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour l'avis avec l'ID: {}", id);
        return ResponseEntity.ok(reviewService.updateReview(id, requestDTO));
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un avis")
    public ResponseEntity<Void> deleteReview(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer l'avis avec l'ID: {}", id);
        reviewService.deleteReview(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Récupérer les avis d'un client")
    public ResponseEntity<List<ReviewDTO>> getReviewsByCustomer(@PathVariable Long customerId) {
        log.info("Requête GET pour récupérer les avis du client avec l'ID: {}", customerId);
        return ResponseEntity.ok(reviewService.getReviewsByCustomer(customerId));
    }
}

