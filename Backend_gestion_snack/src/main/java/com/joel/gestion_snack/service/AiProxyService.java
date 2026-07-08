package com.joel.gestion_snack.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class AiProxyService {

    private final WebClient groqClient;
    private final WebClient elevenLabsClient;

    @Value("${groq.api-key:}") private String groqApiKey;
    @Value("${elevenlabs.api-key:}") private String elevenLabsApiKey;
    @Value("${elevenlabs.voice-id:pNInz6obpgDQGcFmaJgB}") private String elevenLabsVoiceId;
    @Value("${elevenlabs.model-id:eleven_turbo_v2_5}") private String elevenLabsModelId;

    private static final String GROQ_MODEL = "openai/gpt-oss-120b";

    public AiProxyService(WebClient.Builder b) {
        this.groqClient = b.baseUrl("https://api.groq.com").build();
        this.elevenLabsClient = b.baseUrl("https://api.elevenlabs.io")
                .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024)).build();
    }

    @SuppressWarnings("unchecked")
    public String chat(List<Map<String, String>> messages, boolean voiceMode) {
        if (groqApiKey == null || groqApiKey.isBlank())
            throw new IllegalStateException("GROQ_API_KEY non configurée");
        Map<String, Object> body = Map.of(
                "model", GROQ_MODEL, "messages", messages,
                "temperature", 0.5, "max_tokens", voiceMode ? 180 : 512);
        Map<String, Object> resp = groqClient.post()
                .uri("/openai/v1/chat/completions")
                .header("Authorization", "Bearer " + groqApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body).retrieve().bodyToMono(Map.class).block();
        List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.get("choices");
        Map<String, Object> msg = (Map<String, Object>) choices.get(0).get("message");
        return (String) msg.get("content");
    }

    public byte[] textToSpeech(String text) {
        if (elevenLabsApiKey == null || elevenLabsApiKey.isBlank())
            throw new IllegalStateException("ELEVENLABS_API_KEY non configurée");
        Map<String, Object> body = Map.of(
                "text", text, "model_id", elevenLabsModelId,
                "voice_settings", Map.of("stability", 0.5, "similarity_boost", 0.75));
        return elevenLabsClient.post()
                .uri(u -> u.path("/v1/text-to-speech/" + elevenLabsVoiceId + "/stream")
                        .queryParam("optimize_streaming_latency", 4)
                        .queryParam("output_format", "mp3_44100_128").build())
                .header("xi-api-key", elevenLabsApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body).retrieve().bodyToMono(byte[].class).block();
    }
}
