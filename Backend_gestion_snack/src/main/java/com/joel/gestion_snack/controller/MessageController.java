package com.joel.gestion_snack.controller;

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
    public ResponseEntity<List<MessageDTO>> getMessagesByUser(@PathVariable Long userId) {
        return ResponseEntity.ok(messageService.getMessagesByUser(userId));
    }

    @PostMapping
    public ResponseEntity<MessageDTO> saveMessage(@RequestBody MessageDTO messageDTO) {
        return ResponseEntity.ok(messageService.saveMessage(messageDTO));
    }
}
