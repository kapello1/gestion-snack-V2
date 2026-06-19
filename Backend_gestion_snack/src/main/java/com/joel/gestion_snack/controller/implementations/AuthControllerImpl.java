package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.LoginRequestDTO;
import com.joel.gestion_snack.model.dto.LoginResponseDTO;
import com.joel.gestion_snack.model.dto.TwoFactorVerifyDTO;
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

    @PostMapping("/verify-2fa")
    @Operation(summary = "Vérifier le code 2FA et finaliser la connexion")
    public ResponseEntity<LoginResponseDTO> verify2FA(@Valid @RequestBody TwoFactorVerifyDTO dto) {
        log.info("Requête POST verify-2fa pour userId: {}", dto.getUserId());
        LoginResponseDTO response = userService.verify2FACode(dto.getUserId(), dto.getCode());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-2fa")
    @Operation(summary = "Renvoyer un nouveau code 2FA par email")
    public ResponseEntity<Map<String, String>> resend2FA(@RequestBody Map<String, Long> body) {
        Long userId = body.get("userId");
        if (userId == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "L'identifiant utilisateur est obligatoire"));
        }
        log.info("Requête POST resend-2fa pour userId: {}", userId);
        userService.resend2FACode(userId);
        return ResponseEntity.ok(Map.of("message", "Nouveau code envoyé à votre adresse email"));
    }

    @PostMapping("/verify-device")
    @Operation(summary = "Vérifier le code reçu pour valider un nouvel appareil et finaliser la connexion")
    public ResponseEntity<?> verifyDevice(@RequestBody Map<String, Object> body) {
        Object userIdObj = body.get("userId");
        String code = (String) body.get("code");
        if (userIdObj == null || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId et code sont obligatoires"));
        }
        Long userId = Long.valueOf(userIdObj.toString());
        log.info("Requête POST verify-device pour userId: {}", userId);
        LoginResponseDTO response = userService.verifyDeviceCode(userId, code);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/resend-device-code")
    @Operation(summary = "Renvoyer un nouveau code de vérification d'appareil par email")
    public ResponseEntity<Map<String, String>> resendDeviceCode(@RequestBody Map<String, Object> body) {
        Object userIdObj = body.get("userId");
        if (userIdObj == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "userId est obligatoire"));
        }
        Long userId = Long.valueOf(userIdObj.toString());
        log.info("Requête POST resend-device-code pour userId: {}", userId);
        userService.resendDeviceCode(userId);
        return ResponseEntity.ok(Map.of("message", "Nouveau code envoyé à votre adresse email"));
    }

    @PostMapping("/verify-reset-code")
    @Operation(summary = "Vérifier le code reçu par email avant la réinitialisation du mot de passe")
    public ResponseEntity<Map<String, String>> verifyResetCode(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code  = body.get("code");
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email et code sont obligatoires"));
        }
        log.info("Requête POST verify-reset-code pour: {}", email);
        String resetToken = userService.verifyResetCode(email, code);
        return ResponseEntity.ok(Map.of("token", resetToken, "message", "Code vérifié avec succès"));
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
            log.warn("Forgot-password appelé mais MAIL_USERNAME n'est pas configuré - aucun email ne sera envoyé");
            return ResponseEntity.ok(Map.of(
                "message", "Si cet email existe, un lien de réinitialisation a été envoyé.",
                "warning", "Email non configuré sur le serveur - contactez l'administrateur"
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
                "message", "Email non configuré - définissez BREVO_API_KEY dans les variables d'environnement Render"
            ));
        }
        boolean sent = emailService.sendTestEmail(to);
        return ResponseEntity.ok(Map.of(
            "sent", String.valueOf(sent),
            "fromEmail", emailService.getFromEmail(),
            "message", sent ? "Email envoyé avec succès à " + to : "Échec de l'envoi - consultez les logs du serveur"
        ));
    }
}
