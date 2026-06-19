package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.CustomerDTO;
import com.joel.gestion_snack.model.dto.CustomerRequestDTO;

import java.util.List;

/**
 * Interface du service pour la gestion des clients
 */
public interface ICustomerService {
    /**
     * Récupère tous les clients
     * @return Liste de tous les clients
     */
    List<CustomerDTO> getAllCustomers();
    
    /**
     * Récupère un client par son ID
     * @param id ID du client
     * @return DTO du client
     */
    CustomerDTO getCustomerById(Long id);
    
    /**
     * Crée un nouveau client
     * @param requestDTO DTO de requête pour créer un client
     * @return DTO du client créé
     */
    CustomerDTO createCustomer(CustomerRequestDTO requestDTO);
    
    /**
     * Met à jour un client existant
     * @param id ID du client à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour un client
     * @return DTO du client mis à jour
     */
    CustomerDTO updateCustomer(Long id, CustomerRequestDTO requestDTO);
    
    /**
     * Supprime un client par son ID
     * @param id ID du client à supprimer
     */
    void deleteCustomer(Long id);
    
    /**
     * Récupère un client par son email
     * @param email Email du client
     * @return DTO du client
     */
    CustomerDTO getCustomerByEmail(String email);
    
    /**
     * Récupère un client par son nom d'utilisateur
     * @param username Nom d'utilisateur du client
     * @return DTO du client
     */
    CustomerDTO getCustomerByUsername(String username);

    /**
     * Vérifie l'email d'un client via le code à 6 chiffres reçu par email
     * @param email Email du client
     * @param code  Code à 6 chiffres
     * @return DTO du client activé
     */
    CustomerDTO verifyEmailCode(String email, String code);

    /**
     * Vérifie l'email d'un client via son token UUID (lien email — compatibilité)
     * @param token Token de vérification reçu par email
     * @return DTO du client activé
     */
    CustomerDTO verifyEmail(String token);
}

