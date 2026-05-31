package com.joel.gestion_snack.service;

import com.joel.gestion_snack.model.dto.MessageDTO;
import java.util.List;

public interface MessageService {
    List<MessageDTO> getMessagesByUser(Long userId);
    MessageDTO saveMessage(MessageDTO messageDTO);
}
