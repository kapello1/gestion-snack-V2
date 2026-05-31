package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Reservation;
import com.joel.gestion_snack.model.entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

/**
 * Repository pour l'entité Reservation
 */
@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByStatus(ReservationStatus status);
    List<Reservation> findByDatetimeFromBetween(java.time.LocalDateTime from, java.time.LocalDateTime to);
    List<Reservation> findByCustomer_CustomerId(Long customerId);
    List<Reservation> findByTable_TableId(Long tableId);
}
