package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.LoginRequestDTO;
import com.joel.gestion_snack.model.dto.LoginResponseDTO;
import com.joel.gestion_snack.model.dto.UserDTO;
import com.joel.gestion_snack.model.dto.UserRequestDTO;
import com.joel.gestion_snack.model.dto.UserUpdateRequestDTO;

import java.util.List;

/**
 * Interface du service pour la gestion des utilisateurs et l'authentification
 */
public interface IUserService {
    /**
     * Authentifie un utilisateur
     * @param loginRequest DTO de requête de connexion
     * @return DTO de réponse avec les informations de l'utilisateur
     */
    LoginResponseDTO authenticate(LoginRequestDTO loginRequest);
    
    /**
     * Récupère tous les utilisateurs
     * @return Liste de tous les utilisateurs
     */
    List<UserDTO> getAllUsers();
    
    /**
     * Récupère un utilisateur par son ID
     * @param id ID de l'utilisateur
     * @return DTO de l'utilisateur
     */
    UserDTO getUserById(Long id);
    
    /**
     * Crée un nouvel utilisateur
     * @param requestDTO DTO de requête pour créer un utilisateur
     * @return DTO de l'utilisateur créé
     */
    UserDTO createUser(UserRequestDTO requestDTO);
    
    /**
     * Met à jour un utilisateur existant
     * @param id ID de l'utilisateur à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour un utilisateur
     * @return DTO de l'utilisateur mis à jour
     */
    UserDTO updateUser(Long id, UserUpdateRequestDTO requestDTO);
    
    /**
     * Supprime un utilisateur par son ID
     * @param id ID de l'utilisateur à supprimer
     */
    void deleteUser(Long id);
    
    /**
     * Change le mot de passe d'un utilisateur
     * @param id ID de l'utilisateur
     * @param newPassword Nouveau mot de passe
     * @return DTO de l'utilisateur mis à jour
     */
    UserDTO changePassword(Long id, String newPassword);
    
    /**
     * Récupère un utilisateur par son nom d'utilisateur
     * @param username Nom d'utilisateur
     * @return DTO de l'utilisateur
     */
    UserDTO getUserByUsername(String username);
    
    /**
     * Récupère les utilisateurs par rôle
     * @param roleId ID du rôle
     * @return Liste des utilisateurs avec le rôle spécifié
     */
    List<UserDTO> getUsersByRole(Long roleId);

    /**
     * Envoie un email de réinitialisation de mot de passe
     * @param email Email de l'utilisateur
     */
    void forgotPassword(String email);

    /**
     * Réinitialise le mot de passe via un token reçu par email
     * @param token Token de réinitialisation
     * @param newPassword Nouveau mot de passe
     */
    void resetPasswordByToken(String token, String newPassword);

    /**
     * Désactive un utilisateur (soft delete)
     * @param id ID de l'utilisateur
     * @return DTO mis à jour
     */
    UserDTO deactivateUser(Long id);

    /**
     * Réactive un utilisateur
     * @param id ID de l'utilisateur
     * @return DTO mis à jour
     */
    UserDTO activateUser(Long id);

    /**
     * Vérifie le code 2FA et retourne la session complète si valide
     * @param userId ID de l'utilisateur
     * @param code Code à 6 chiffres reçu par email
     * @return DTO de réponse avec les informations de l'utilisateur
     */
    LoginResponseDTO verify2FACode(Long userId, String code);

    /**
     * Régénère un nouveau code 2FA et l'envoie par email (remet twoFactorAttempts à 0)
     * @param userId ID de l'utilisateur
     */
    void resend2FACode(Long userId);
}

