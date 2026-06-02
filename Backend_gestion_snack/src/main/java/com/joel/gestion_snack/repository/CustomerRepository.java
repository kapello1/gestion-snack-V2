package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository pour l'entité Customer
 */
@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    Optional<Customer> findByEmail(String email);
    Optional<Customer> findByUsername(String username);
    Optional<Customer> findByVerificationToken(String token);
}

