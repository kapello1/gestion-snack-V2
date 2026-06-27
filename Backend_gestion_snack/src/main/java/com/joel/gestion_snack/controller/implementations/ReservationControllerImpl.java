package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.AvailabilitySlotDTO;
import com.joel.gestion_snack.model.dto.DiningTableDTO;
import com.joel.gestion_snack.model.dto.ReservationDTO;
import com.joel.gestion_snack.model.dto.ReservationRequestDTO;
import com.joel.gestion_snack.model.entity.ReservationStatus;
import com.joel.gestion_snack.service.interfaces.IReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * Implémentation du contrôleur pour la gestion des réservations
 */
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Réservations", description = "API pour la gestion des réservations")
public class ReservationControllerImpl {
    
    private final IReservationService reservationService;
    
    @GetMapping
    @Operation(summary = "Récupérer toutes les réservations")
    public ResponseEntity<List<ReservationDTO>> getAllReservations() {
        log.info("Requête GET pour récupérer toutes les réservations");
        return ResponseEntity.ok(reservationService.getAllReservations());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une réservation par son ID")
    public ResponseEntity<ReservationDTO> getReservationById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer la réservation avec l'ID: {}", id);
        return ResponseEntity.ok(reservationService.getReservationById(id));
    }
    
    @PostMapping
    @Operation(summary = "Créer une nouvelle réservation")
    public ResponseEntity<ReservationDTO> createReservation(@Valid @RequestBody ReservationRequestDTO requestDTO) {
        log.info("Requête POST pour créer une nouvelle réservation");
        ReservationDTO reservation = reservationService.createReservation(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(reservation);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour une réservation")
    public ResponseEntity<ReservationDTO> updateReservation(@PathVariable Long id, 
                                                              @Valid @RequestBody ReservationRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour la réservation avec l'ID: {}", id);
        return ResponseEntity.ok(reservationService.updateReservation(id, requestDTO));
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une réservation")
    public ResponseEntity<Void> deleteReservation(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer la réservation avec l'ID: {}", id);
        reservationService.deleteReservation(id);
        return ResponseEntity.noContent().build();
    }
    
    @GetMapping("/status/{status}")
    @Operation(summary = "Récupérer les réservations par statut")
    public ResponseEntity<List<ReservationDTO>> getReservationsByStatus(@PathVariable ReservationStatus status) {
        log.info("Requête GET pour récupérer les réservations avec le statut: {}", status);
        return ResponseEntity.ok(reservationService.getReservationsByStatus(status));
    }
    
    @GetMapping("/date/{date}")
    @Operation(summary = "Récupérer les réservations par date")
    public ResponseEntity<List<ReservationDTO>> getReservationsByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Requête GET pour récupérer les réservations de la date: {}", date);
        return ResponseEntity.ok(reservationService.getReservationsByDate(date));
    }
    
    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Récupérer les réservations d'un client")
    public ResponseEntity<List<ReservationDTO>> getReservationsByCustomer(@PathVariable Long customerId) {
        log.info("Requête GET pour récupérer les réservations du client avec l'ID: {}", customerId);
        return ResponseEntity.ok(reservationService.getReservationsByCustomer(customerId));
    }
    
    @PostMapping("/{id}/cancel")
    @Operation(summary = "Annuler une réservation")
    public ResponseEntity<ReservationDTO> cancelReservation(@PathVariable Long id) {
        log.info("Requête POST pour annuler la réservation avec l'ID: {}", id);
        return ResponseEntity.ok(reservationService.cancelReservation(id));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<ReservationDTO> completeReservation(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.completeReservation(id));
    }

    @GetMapping("/available-tables")
    @Operation(summary = "Tables disponibles pour un créneau donné")
    public ResponseEntity<List<DiningTableDTO>> getAvailableTables(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String time,
            @RequestParam(defaultValue = "1") int guests) {
        log.info("Tables disponibles : date={} time={} guests={}", date, time, guests);
        return ResponseEntity.ok(reservationService.getAvailableTablesBySlot(date, time, guests));
    }

    @GetMapping("/availability")
    @Operation(summary = "Obtenir les créneaux disponibles pour une date et un nombre de personnes")
    public ResponseEntity<List<AvailabilitySlotDTO>> getAvailability(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "1") int guests) {
        log.info("Requête GET disponibilités : date={} guests={}", date, guests);
        return ResponseEntity.ok(reservationService.getAvailableSlots(date, guests));
    }
}

