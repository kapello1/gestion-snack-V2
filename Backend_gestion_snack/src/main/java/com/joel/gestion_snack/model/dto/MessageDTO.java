package com.joel.gestion_snack.model.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class MessageDTO {
    private Long idMessage;
    private Long userId;
    private String senderType; // USER ou BOT
    private Long orderId;
    private Long responseToMessageId;
    private String content;
    private Boolean isRead;
    private LocalDateTime sentAt;
}
