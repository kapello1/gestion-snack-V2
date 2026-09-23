package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.entity.RoleType;
import com.joel.gestion_snack.security.AuthUser;
import com.joel.gestion_snack.security.SecurityUtils;
import org.springframework.security.access.prepost.PreAuthorize;
import com.joel.gestion_snack.model.dto.UserDTO;
import com.joel.gestion_snack.model.dto.UserRequestDTO;
import com.joel.gestion_snack.model.dto.UserUpdateRequestDTO;
import com.joel.gestion_snack.service.interfaces.IUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Implémentation du contrôleur pour la gestion des utilisateurs (par l'administrateur)
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Utilisateurs", description = "API pour la gestion des utilisateurs (Administrateur)")
public class UserControllerImpl {
    
    private final IUserService userService;
    
    @GetMapping
    @Operation(summary = "Récupérer tous les utilisateurs", description = "Récupère la liste de tous les utilisateurs du système")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        log.info("Requête GET pour récupérer tous les utilisateurs");
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un utilisateur par son ID")
    @PreAuthorize("hasRole('ADMIN') or @authz.isUser(authentication, #id)")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer l'utilisateur avec l'ID: {}", id);
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
    
    @PostMapping
    @Operation(summary = "Créer un nouvel utilisateur", description = "Crée un nouvel utilisateur dans le système")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> createUser(@Valid @RequestBody UserRequestDTO requestDTO) {
        log.info("Requête POST pour créer un nouvel utilisateur: {}", requestDTO.getUsername());
        UserDTO user = userService.createUser(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(user);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un utilisateur", description = "Met à jour les informations d'un utilisateur existant")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> updateUser(@PathVariable Long id,
                                              @Valid @RequestBody UserUpdateRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour l'utilisateur avec l'ID: {}", id);
        UserDTO user = userService.updateUser(id, requestDTO);
        return ResponseEntity.ok(user);
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un utilisateur", description = "Supprime un utilisateur du système")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer l'utilisateur avec l'ID: {}", id);
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{id}/change-password")
    @Operation(summary = "Changer le mot de passe d'un utilisateur", description = "Change le mot de passe d'un utilisateur")
    @PreAuthorize("hasRole('ADMIN') or @authz.isUser(authentication, #id)")
    public ResponseEntity<UserDTO> changePassword(@PathVariable Long id, 
                                                   @RequestBody Map<String, String> passwordRequest) {
        log.info("Requête POST pour changer le mot de passe de l'utilisateur avec l'ID: {}", id);
        String newPassword = passwordRequest.get("newPassword");
        if (newPassword == null || newPassword.isEmpty()) {
            throw new IllegalArgumentException("Le nouveau mot de passe est obligatoire");
        }
        // Un administrateur peut réinitialiser le mot de passe d'un AUTRE compte sans l'ancien ;
        // chacun, y compris l'administrateur pour son propre compte, doit fournir son mot de passe actuel.
        AuthUser me = SecurityUtils.currentUser();
        boolean adminResettingSomeoneElse = me != null && me.getRole() == RoleType.ADMIN && !id.equals(me.getUserId());
        if (adminResettingSomeoneElse) {
            return ResponseEntity.ok(userService.changePassword(id, newPassword));
        }
        String currentPassword = passwordRequest.get("currentPassword");
        if (currentPassword == null || currentPassword.isEmpty()) {
            throw new IllegalArgumentException("Le mot de passe actuel est obligatoire");
        }
        return ResponseEntity.ok(userService.changeOwnPassword(id, currentPassword, newPassword));
    }
    
    @GetMapping("/username/{username}")
    @Operation(summary = "Récupérer un utilisateur par son nom d'utilisateur")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> getUserByUsername(@PathVariable String username) {
        log.info("Requête GET pour récupérer l'utilisateur avec le username: {}", username);
        UserDTO user = userService.getUserByUsername(username);
        return ResponseEntity.ok(user);
    }
    
    @GetMapping("/role/{roleId}")
    @Operation(summary = "Récupérer les utilisateurs par rôle")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@PathVariable Long roleId) {
        log.info("Requête GET pour récupérer les utilisateurs avec le rôle ID: {}", roleId);
        List<UserDTO> users = userService.getUsersByRole(roleId);
        return ResponseEntity.ok(users);
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Désactiver un utilisateur (soft delete)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> deactivateUser(@PathVariable Long id) {
        log.info("Requête PATCH pour désactiver l'utilisateur avec l'ID: {}", id);
        return ResponseEntity.ok(userService.deactivateUser(id));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Réactiver un utilisateur")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserDTO> activateUser(@PathVariable Long id) {
        log.info("Requête PATCH pour activer l'utilisateur avec l'ID: {}", id);
        return ResponseEntity.ok(userService.activateUser(id));
    }
}

