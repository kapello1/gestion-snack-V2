package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Viande;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ViandeRepository extends JpaRepository<Viande, Long> {
    List<Viande> findByIsAvailableTrue();
}
