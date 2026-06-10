package com.joel.gestion_snack.service;

import com.joel.gestion_snack.model.dto.MessageDTO;
import java.util.List;

public interface MessageService {
    List<MessageDTO> getMessagesByUser(Long userId);
    MessageDTO saveMessage(MessageDTO messageDTO);
    List<MessageDTO> getNotificationsForUser(Long userId);
    MessageDTO savePersonalNotification(Long ownerId, String title, String message, String type);
    MessageDTO saveBroadcastNotification(String title, String message);
    void markAsRead(Long messageId);
}
