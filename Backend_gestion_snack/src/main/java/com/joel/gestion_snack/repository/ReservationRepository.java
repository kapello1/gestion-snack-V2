package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Reservation;
import com.joel.gestion_snack.model.entity.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByStatus(ReservationStatus status);
    List<Reservation> findByDatetimeFromBetween(LocalDateTime from, LocalDateTime to);
    List<Reservation> findByCustomer_CustomerId(Long customerId);
    List<Reservation> findByTable_TableId(Long tableId);

    /** IDs des tables déjà occupées (BOOKED) pendant l'intervalle [slotStart, slotEnd[ */
    @Query("SELECT r.table.tableId FROM Reservation r WHERE " +
           "r.status = com.joel.gestion_snack.model.entity.ReservationStatus.BOOKED " +
           "AND r.datetimeFrom < :slotEnd " +
           "AND r.datetimeTo > :slotStart")
    List<Long> findOccupiedTableIdsDuringSlot(
            @Param("slotStart") LocalDateTime slotStart,
            @Param("slotEnd") LocalDateTime slotEnd);

    /** Réservations BOOKED d'une table qui chevauchent l'intervalle donné */
    @Query("SELECT r FROM Reservation r WHERE r.table.tableId = :tableId " +
           "AND r.status = com.joel.gestion_snack.model.entity.ReservationStatus.BOOKED " +
           "AND r.datetimeFrom < :slotEnd " +
           "AND r.datetimeTo > :slotStart")
    List<Reservation> findOverlappingByTable(
            @Param("tableId") Long tableId,
            @Param("slotStart") LocalDateTime slotStart,
            @Param("slotEnd") LocalDateTime slotEnd);
}
