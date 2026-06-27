package com.joel.gestion_snack.service;

import com.joel.gestion_snack.model.dto.AvailabilitySlotDTO;
import com.joel.gestion_snack.model.dto.ReservationDTO;
import com.joel.gestion_snack.model.dto.ReservationRequestDTO;
import com.joel.gestion_snack.service.interfaces.IReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiAssistantService {

    private final WebClient.Builder webClientBuilder;
    private final IReservationService reservationService;

    @Value("${groq.api-key:}")
    private String groqApiKey;

    private static final String GROQ_MODEL = "openai/gpt-oss-120b";

    // Déclaration des outils que le modèle peut appeler
    private List<Map<String, Object>> tools() {
        Map<String, Object> dispo = Map.of(
            "type", "function",
            "function", Map.of(
                "name", "verifier_disponibilite",
                "description", "Vérifie les créneaux horaires disponibles pour réserver une table à une date donnée et pour un nombre de personnes.",
                "parameters", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "date", Map.of("type", "string", "description", "Date au format AAAA-MM-JJ"),
                        "guests", Map.of("type", "integer", "description", "Nombre de personnes")
                    ),
                    "required", List.of("date", "guests")
                )
            )
        );
        Map<String, Object> reserver = Map.of(
            "type", "function",
            "function", Map.of(
                "name", "creer_reservation",
                "description", "Crée une réservation de table CONFIRMÉE. À n'appeler QUE si le client a explicitement confirmé la date, l'heure et le nombre de personnes.",
                "parameters", Map.of(
                    "type", "object",
                    "properties", Map.of(
                        "date", Map.of("type", "string", "description", "Date au format AAAA-MM-JJ"),
                        "time", Map.of("type", "string", "description", "Heure au format HH:mm"),
                        "guests", Map.of("type", "integer", "description", "Nombre de personnes")
                    ),
                    "required", List.of("date", "time", "guests")
                )
            )
        );
        return List.of(dispo, reserver);
    }

    // Exécute un outil demandé par le modèle et renvoie le résultat en texte
    private String executeTool(String name, Map<String, Object> args, Long customerId) {
        try {
            if ("verifier_disponibilite".equals(name)) {
                LocalDate date = LocalDate.parse((String) args.get("date"));
                int guests = ((Number) args.get("guests")).intValue();
                List<AvailabilitySlotDTO> slots = reservationService.getAvailableSlots(date, guests);
                List<String> dispo = new ArrayList<>();
                for (AvailabilitySlotDTO s : slots) {
                    if (s.getAvailableTables() > 0) dispo.add(s.getTime());
                }
                if (dispo.isEmpty()) return "Aucun créneau disponible ce jour-là pour " + guests + " personnes.";
                return "Créneaux disponibles : " + String.join(", ", dispo);
            }
            if ("creer_reservation".equals(name)) {
                if (customerId == null) return "ERREUR : le client doit être connecté pour réserver.";
                ReservationRequestDTO req = new ReservationRequestDTO();
                req.setCustomerId(customerId);
                req.setGuests(((Number) args.get("guests")).intValue());
                req.setDate((String) args.get("date"));
                req.setTime((String) args.get("time"));
                req.setCreatedBy("chatbot");
                ReservationDTO r = reservationService.createReservation(req);
                return "Réservation confirmée (numéro " + r.getReservationId() + ") pour le "
                        + args.get("date") + " à " + args.get("time") + ".";
            }
            return "Outil inconnu.";
        } catch (Exception e) {
            log.error("Erreur exécution outil {}: {}", name, e.getMessage());
            return "ERREUR lors de l'exécution : " + e.getMessage();
        }
    }

    /**
     * Boucle de function calling : envoie la conversation à Groq avec les outils,
     * exécute les outils demandés, et renvoie la réponse finale en texte.
     */
    @SuppressWarnings("unchecked")
    public String chatWithTools(List<Map<String, Object>> messages, Long customerId, boolean voiceMode) {
        if (groqApiKey == null || groqApiKey.isBlank())
            throw new IllegalStateException("GROQ_API_KEY non configurée");

        WebClient client = webClientBuilder.baseUrl("https://api.groq.com").build();
        List<Map<String, Object>> conversation = new ArrayList<>(messages);

        // Message système : règles de comportement + date du jour
        String today = java.time.LocalDate.now(java.time.ZoneId.of("Europe/Brussels")).toString();
        String systemPrompt = "Tu es l'assistant de réservation du Snack Tiegni Bernard. "
            + "La date d'aujourd'hui est " + today + " (fuseau Europe/Brussels). "
            + "Utilise cette date pour interpréter 'aujourd'hui', 'demain', 'ce soir', etc. "
            + "RÈGLES IMPÉRATIVES pour réserver une table :\n"
            + "1. D'abord, appelle TOUJOURS verifier_disponibilite pour proposer les créneaux réellement libres.\n"
            + "2. Présente les créneaux disponibles au client et DEMANDE-LUI de choisir et de CONFIRMER.\n"
            + "3. N'appelle creer_reservation QUE lorsque le client a EXPLICITEMENT confirmé une date, une heure ET un nombre de personnes précis. "
            + "Ne réserve JAMAIS sans cette confirmation explicite.\n"
            + "4. Si une information manque (date, heure, ou nombre de personnes), demande-la avant de continuer.\n"
            + "5. Après une réservation réussie, communique le numéro de réservation au client.\n"
            + "Réponds toujours en français, de façon chaleureuse et concise."
            + (voiceMode ? " Mode vocal : 1 à 3 phrases courtes maximum, sans markdown ni émojis." : "");
        conversation.add(0, Map.of("role", "system", "content", systemPrompt));

        // Maximum 5 tours pour éviter une boucle infinie
        for (int turn = 0; turn < 5; turn++) {
            Map<String, Object> body = Map.of(
                    "model", GROQ_MODEL,
                    "messages", conversation,
                    "tools", tools(),
                    "tool_choice", "auto",
                    "temperature", 0.3,
                    "max_tokens", 700);

            Map<String, Object> resp = client.post()
                    .uri("/openai/v1/chat/completions")
                    .header("Authorization", "Bearer " + groqApiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body).retrieve().bodyToMono(Map.class).block();

            List<Map<String, Object>> choices = (List<Map<String, Object>>) resp.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            List<Map<String, Object>> toolCalls = (List<Map<String, Object>>) message.get("tool_calls");

            // Pas d'appel d'outil → réponse finale en texte
            if (toolCalls == null || toolCalls.isEmpty()) {
                return (String) message.get("content");
            }

            // Ajoute le message assistant (avec ses tool_calls) à la conversation
            conversation.add(message);

            // Exécute chaque outil et ajoute le résultat
            for (Map<String, Object> call : toolCalls) {
                Map<String, Object> fn = (Map<String, Object>) call.get("function");
                String name = (String) fn.get("name");
                String argsJson = (String) fn.get("arguments");
                String result;
                try {
                    Map<String, Object> args = new com.fasterxml.jackson.databind.ObjectMapper()
                            .readValue(argsJson, Map.class);
                    result = executeTool(name, args, customerId);
                } catch (Exception e) {
                    log.error("Erreur parsing args pour outil {}: {}", name, e.getMessage());
                    result = "ERREUR : arguments invalides pour l'outil " + name;
                }
                conversation.add(Map.of(
                        "role", "tool",
                        "tool_call_id", call.get("id"),
                        "content", result));
            }
        }
        return "Désolé, je n'ai pas pu finaliser votre demande. Veuillez réessayer.";
    }
}
