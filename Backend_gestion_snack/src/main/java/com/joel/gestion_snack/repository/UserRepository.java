package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.RoleType;
import com.joel.gestion_snack.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository pour l'entité User
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findFirstByEmailIgnoreCase(String email);
    Optional<User> findFirstByOwnerId(Long ownerId);
    Optional<User> findByResetPasswordToken(String token);

    /** Vue minimale (sans lazy loading) utilisée à chaque requête authentifiée. */
    @Query("select u.userId as userId, u.username as username, u.ownerId as ownerId, "
            + "u.isActive as isActive, r.roleName as roleName "
            + "from User u join u.role r where u.userId = :id")
    Optional<UserSessionView> findSessionView(@Param("id") Long id);

    interface UserSessionView {
        Long getUserId();
        String getUsername();
        Long getOwnerId();
        Boolean getIsActive();
        RoleType getRoleName();
    }
}
