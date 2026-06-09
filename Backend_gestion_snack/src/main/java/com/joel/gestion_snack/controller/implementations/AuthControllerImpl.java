package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.LoginRequestDTO;
import com.joel.gestion_snack.model.dto.LoginResponseDTO;
import com.joel.gestion_snack.service.EmailService;
import com.joel.gestion_snack.service.interfaces.IUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentification", description = "API pour l'authentification des utilisateurs")
public class AuthControllerImpl {

    private final IUserService userService;
    private final EmailService emailService;

    @PostMapping("/login")
    @Operation(summary = "Authentifier un utilisateur")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO loginRequest) {
        log.info("Requête POST pour authentifier l'utilisateur: {}", loginRequest.getUsername());
        LoginResponseDTO response = userService.authenticate(loginRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Demander la réinitialisation du mot de passe par email")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'email est obligatoire"));
        }
        log.info("Requête POST forgot-password pour: {}", email);
        if (!emailService.isConfigured()) {
            log.warn("Forgot-password appelé mais MAIL_USERNAME n'est pas configuré — aucun email ne sera envoyé");
            return ResponseEntity.ok(Map.of(
                "message", "Si cet email existe, un lien de réinitialisation a été envoyé.",
                "warning", "Email non configuré sur le serveur — contactez l'administrateur"
            ));
        }
        userService.forgotPassword(email);
        return ResponseEntity.ok(Map.of("message", "Si cet email existe, un lien de réinitialisation a été envoyé."));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Réinitialiser le mot de passe via token")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("newPassword");
        if (token == null || token.isBlank() || newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token et nouveau mot de passe sont obligatoires"));
        }
        log.info("Requête POST reset-password via token");
        userService.resetPasswordByToken(token, newPassword);
        return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès."));
    }

    @PostMapping("/test-email")
    @Operation(summary = "Envoyer un email de test pour vérifier la configuration SMTP")
    public ResponseEntity<Map<String, String>> testEmail(@RequestBody Map<String, String> body) {
        String to = body.get("to");
        if (to == null || to.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Le champ 'to' est obligatoire"));
        }
        if (!emailService.isConfigured()) {
            return ResponseEntity.ok(Map.of(
                "sent", "false",
                "fromEmail", "(non configuré)",
                "message", "Email non configuré — définissez BREVO_API_KEY dans les variables d'environnement Render"
            ));
        }
        boolean sent = emailService.sendTestEmail(to);
        return ResponseEntity.ok(Map.of(
            "sent", String.valueOf(sent),
            "fromEmail", emailService.getFromEmail(),
            "message", sent ? "Email envoyé avec succès à " + to : "Échec de l'envoi — consultez les logs du serveur"
        ));
    }
}
