package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.DiningTable;
import com.joel.gestion_snack.model.entity.TableStatusType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository pour l'entité DiningTable
 */
@Repository
public interface DiningTableRepository extends JpaRepository<DiningTable, Long> {
    List<DiningTable> findByStatus(TableStatusType status);
    Optional<DiningTable> findByTableNumber(Integer tableNumber);

    /** Lock pessimiste — empêche deux commandes simultanées sur la même table */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM DiningTable t WHERE t.tableId = :id")
    Optional<DiningTable> findByIdForUpdate(@Param("id") Long id);
}

