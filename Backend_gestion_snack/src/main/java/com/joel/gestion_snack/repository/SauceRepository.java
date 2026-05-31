package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Sauce;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SauceRepository extends JpaRepository<Sauce, Long> {
    List<Sauce> findByIsAvailableTrue();
}
