package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.config.WebSocketEventPublisher;
import com.joel.gestion_snack.model.dto.MessageDTO;
import com.joel.gestion_snack.model.entity.Message;
import com.joel.gestion_snack.model.entity.MessageSourceType;
import com.joel.gestion_snack.model.entity.User;
import com.joel.gestion_snack.repository.MessageRepository;
import com.joel.gestion_snack.repository.UserRepository;
import com.joel.gestion_snack.service.MessageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class MessageServiceImpl implements MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private WebSocketEventPublisher wsPublisher;

    @Override
    public List<MessageDTO> getMessagesByUser(Long userId) {
        return messageRepository.findByUserUserIdOrderBySentAtAsc(userId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Override
    public MessageDTO saveMessage(MessageDTO messageDTO) {
        User user = userRepository.findById(messageDTO.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Message message = new Message();
        message.setUser(user);
        message.setContent(messageDTO.getContent());
        message.setSenderType(MessageSourceType.valueOf(messageDTO.getSenderType()));
        message.setIsRead(messageDTO.getIsRead() != null ? messageDTO.getIsRead() : false);
        message.setSentAt(LocalDateTime.now());

        Message savedMessage = messageRepository.save(message);
        return mapToDTO(savedMessage);
    }

    @Override
    public List<MessageDTO> getNotificationsForUser(Long userId) {
        List<MessageDTO> personal = messageRepository.findByUserUserIdOrderBySentAtDesc(userId)
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
        List<MessageDTO> broadcasts = messageRepository.findByIsBroadcastTrueOrderBySentAtDesc()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());

        List<MessageDTO> all = new ArrayList<>(personal);
        all.addAll(broadcasts);
        all.sort(Comparator.comparing(MessageDTO::getSentAt, Comparator.nullsLast(Comparator.reverseOrder())));
        return all;
    }

    @Override
    public MessageDTO savePersonalNotification(Long ownerId, String title, String message, String type) {
        // Cherche d'abord par ownerId (customerId ou employeeId), puis par userId direct
        User user = userRepository.findByOwnerId(ownerId)
                .orElseGet(() -> userRepository.findById(ownerId).orElse(null));

        if (user == null) {
            log.warn("Utilisateur introuvable pour ownerId={} lors de l'envoi de notification", ownerId);
            throw new RuntimeException("Utilisateur introuvable pour id: " + ownerId);
        }

        Message msg = new Message();
        msg.setUser(user);
        msg.setTitle(title);
        msg.setContent(message);
        msg.setNotifType(type);
        msg.setIsBroadcast(false);
        msg.setIsRead(false);
        msg.setSenderType(MessageSourceType.BOT);
        msg.setSentAt(LocalDateTime.now());
        Message saved = messageRepository.save(msg);

        wsPublisher.publishNotificationToUser(user.getUserId(), title, message, type);
        log.info("Notification personnelle envoyée à userId={}: {}", user.getUserId(), title);
        return mapToDTO(saved);
    }

    @Override
    public MessageDTO saveBroadcastNotification(String title, String message) {
        Message msg = new Message();
        msg.setUser(null);
        msg.setTitle(title);
        msg.setContent(message);
        msg.setNotifType("admin_broadcast");
        msg.setIsBroadcast(true);
        msg.setIsRead(false);
        msg.setSenderType(MessageSourceType.USER);
        msg.setSentAt(LocalDateTime.now());
        Message saved = messageRepository.save(msg);

        wsPublisher.publishBroadcastNotification(title, message);
        log.info("Notification broadcast envoyée : {}", title);
        return mapToDTO(saved);
    }

    @Override
    public void markAsRead(Long messageId) {
        messageRepository.findById(messageId).ifPresent(msg -> {
            msg.setIsRead(true);
            messageRepository.save(msg);
        });
    }

    @Override
    public void deleteMessage(Long messageId) {
        messageRepository.deleteById(messageId);
    }

    private MessageDTO mapToDTO(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setIdMessage(message.getIdMessage());
        dto.setUserId(message.getUser() != null ? message.getUser().getUserId() : null);
        dto.setSenderType(message.getSenderType() != null ? message.getSenderType().name() : null);
        dto.setContent(message.getContent());
        dto.setTitle(message.getTitle());
        dto.setNotifType(message.getNotifType());
        dto.setIsBroadcast(message.getIsBroadcast() != null ? message.getIsBroadcast() : false);
        dto.setIsRead(message.getIsRead() != null ? message.getIsRead() : false);
        dto.setSentAt(message.getSentAt());
        return dto;
    }
}
