package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.LoginRequestDTO;
import com.joel.gestion_snack.model.dto.LoginResponseDTO;
import com.joel.gestion_snack.service.interfaces.IUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Implémentation du contrôleur pour l'authentification
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentification", description = "API pour l'authentification des utilisateurs")
public class AuthControllerImpl {
    
    private final IUserService userService;
    
    @PostMapping("/login")
    @Operation(summary = "Authentifier un utilisateur", description = "Connecte un utilisateur avec son nom d'utilisateur et son mot de passe")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO loginRequest) {
        log.info("Requête POST pour authentifier l'utilisateur: {}", loginRequest.getUsername());
        LoginResponseDTO response = userService.authenticate(loginRequest);
        return ResponseEntity.ok(response);
    }
}

