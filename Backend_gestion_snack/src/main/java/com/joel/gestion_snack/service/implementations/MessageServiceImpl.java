package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.MessageDTO;
import com.joel.gestion_snack.model.entity.Message;
import com.joel.gestion_snack.model.entity.MessageSourceType;
import com.joel.gestion_snack.model.entity.User;
import com.joel.gestion_snack.repository.MessageRepository;
import com.joel.gestion_snack.repository.UserRepository;
import com.joel.gestion_snack.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageServiceImpl implements MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private UserRepository userRepository;

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

    private MessageDTO mapToDTO(Message message) {
        MessageDTO dto = new MessageDTO();
        dto.setIdMessage(message.getIdMessage());
        dto.setUserId(message.getUser().getUserId());
        dto.setSenderType(message.getSenderType().name());
        dto.setContent(message.getContent());
        dto.setIsRead(message.getIsRead());
        dto.setSentAt(message.getSentAt());
        return dto;
    }
}
