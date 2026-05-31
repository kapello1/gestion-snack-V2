package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Dessert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DessertRepository extends JpaRepository<Dessert, Long> {
    List<Dessert> findByIsAvailableTrue();
}
