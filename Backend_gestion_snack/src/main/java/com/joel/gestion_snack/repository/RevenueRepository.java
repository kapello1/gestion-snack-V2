package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Revenue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Repository pour la gestion du chiffre d'affaires
 */
@Repository
public interface RevenueRepository extends JpaRepository<Revenue, Long> {
    
    /**
     * Trouve le chiffre d'affaires pour une date donnée
     */
    Optional<Revenue> findByDate(LocalDate date);
}
