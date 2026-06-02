package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository pour l'entité User
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByOwnerId(Long ownerId);
    Optional<User> findByResetPasswordToken(String token);
}

