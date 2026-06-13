package com.joel.gestion_snack.repository;

import com.joel.gestion_snack.model.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByUserUserIdOrderBySentAtAsc(Long userId);
    List<Message> findByUserUserIdOrderBySentAtDesc(Long userId);
    List<Message> findByIsBroadcastTrueOrderBySentAtDesc();
    List<Message> findByIsBroadcastTrueAndSentAtGreaterThanEqualOrderBySentAtDesc(LocalDateTime sentAfter);
}
