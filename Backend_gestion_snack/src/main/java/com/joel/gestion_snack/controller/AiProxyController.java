package com.joel.gestion_snack.controller;

import com.joel.gestion_snack.service.AiAssistantService;
import com.joel.gestion_snack.service.AiProxyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiProxyController {

    private final AiProxyService aiProxyService;
    private final AiAssistantService aiAssistantService;

    @PostMapping("/chat")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> body) {
        try {
            List<Map<String, String>> messages = (List<Map<String, String>>) body.get("messages");
            boolean voiceMode = Boolean.TRUE.equals(body.get("voiceMode"));
            return ResponseEntity.ok(Map.of("content", aiProxyService.chat(messages, voiceMode)));
        } catch (Exception e) {
            log.error("Proxy chat Groq: {}", e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Erreur du service de chat"));
        }
    }

    @PostMapping("/assistant")
    @SuppressWarnings("unchecked")
    public ResponseEntity<?> assistant(@RequestBody Map<String, Object> body) {
        try {
            List<Map<String, Object>> messages = (List<Map<String, Object>>) body.get("messages");
            Long customerId = body.get("customerId") != null
                    ? Long.valueOf(body.get("customerId").toString()) : null;
            boolean voiceMode = Boolean.TRUE.equals(body.get("voiceMode"));
            String content = aiAssistantService.chatWithTools(messages, customerId, voiceMode);
            return ResponseEntity.ok(Map.of("content", content));
        } catch (Exception e) {
            log.error("Proxy assistant: {}", e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Erreur de l'assistant"));
        }
    }

    @PostMapping("/tts")
    public ResponseEntity<?> tts(@RequestBody Map<String, String> body) {
        try {
            String text = body.get("text");
            if (text == null || text.isBlank())
                return ResponseEntity.badRequest().body(Map.of("error", "texte manquant"));
            return ResponseEntity.ok().contentType(MediaType.parseMediaType("audio/mpeg"))
                    .body(aiProxyService.textToSpeech(text));
        } catch (Exception e) {
            log.error("Proxy TTS ElevenLabs: {}", e.getMessage());
            return ResponseEntity.status(502).body(Map.of("error", "Erreur du service vocal"));
        }
    }
}
