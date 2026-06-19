package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.User;
import com.joel.gestion_snack.model.entity.UserDevice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserDeviceRepository extends JpaRepository<UserDevice, Long> {

    boolean existsByUserAndDeviceToken(User user, String deviceToken);

    Optional<UserDevice> findByUserAndDeviceToken(User user, String deviceToken);

    List<UserDevice> findAllByUser(User user);
}
