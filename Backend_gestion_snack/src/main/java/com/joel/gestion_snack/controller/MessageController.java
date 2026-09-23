package com.joel.gestion_snack.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import com.joel.gestion_snack.model.dto.MessageDTO;
import com.joel.gestion_snack.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @authz.isUser(authentication, #userId)")
    public ResponseEntity<List<MessageDTO>> getMessagesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(messageService.getMessagesByUser(userId));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or @authz.isUser(authentication, #messageDTO.userId)")
    public ResponseEntity<MessageDTO> saveMessage(@RequestBody MessageDTO messageDTO) {
        return ResponseEntity.ok(messageService.saveMessage(messageDTO));
    }

    /** Récupère toutes les notifications (personnelles + broadcasts) pour un utilisateur */
    @GetMapping("/notifications/{userId}")
    @PreAuthorize("hasRole('ADMIN') or @authz.isUser(authentication, #userId)")
    public ResponseEntity<List<MessageDTO>> getNotificationsForUser(@PathVariable Long userId) {
        return ResponseEntity.ok(messageService.getNotificationsForUser(userId));
    }

    /** Envoie une notification personnelle à un utilisateur identifié par son ownerId ou userId */
    @PostMapping("/personal/{ownerId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<MessageDTO> savePersonalNotification(
            @PathVariable Long ownerId,
            @RequestBody MessageDTO dto) {
        return ResponseEntity.ok(
                messageService.savePersonalNotification(
                        ownerId,
                        dto.getTitle(),
                        dto.getContent(),
                        dto.getNotifType() != null ? dto.getNotifType() : "order_status"));
    }

    /** Envoie une notification broadcast à tous les utilisateurs */
    @PostMapping("/broadcast")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageDTO> saveBroadcastNotification(@RequestBody MessageDTO dto) {
        return ResponseEntity.ok(
                messageService.saveBroadcastNotification(
                        dto.getTitle() != null ? dto.getTitle() : "Message de l'administration",
                        dto.getContent()));
    }

    /** Marque une notification comme lue */
    @PatchMapping("/{id}/read")
    @PreAuthorize("hasRole('ADMIN') or @authz.canReadMessage(authentication, #id)")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        messageService.markAsRead(id);
        return ResponseEntity.noContent().build();
    }

    /** Supprime un message (chatbot ou notification personnelle) par son ID */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @authz.ownsMessage(authentication, #id)")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }
}
