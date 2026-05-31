package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.ProviderDTO;
import com.joel.gestion_snack.model.dto.ProviderProductDTO;
import com.joel.gestion_snack.model.dto.ProviderProductRequestDTO;
import com.joel.gestion_snack.model.dto.ProviderRequestDTO;

import java.util.List;

/**
 * Interface du service pour la gestion des fournisseurs
 */
public interface IProviderService {
    /**
     * Récupère tous les fournisseurs
     * 
     * @return Liste de tous les fournisseurs
     */
    List<ProviderDTO> getAllProviders();

    /**
     * Récupère un fournisseur par son ID
     * 
     * @param id ID du fournisseur
     * @return DTO du fournisseur
     */
    ProviderDTO getProviderById(Long id);

    /**
     * Crée un nouveau fournisseur
     * 
     * @param requestDTO DTO de requête pour créer un fournisseur
     * @return DTO du fournisseur créé
     */
    ProviderDTO createProvider(ProviderRequestDTO requestDTO);

    /**
     * Met à jour un fournisseur existant
     * 
     * @param id         ID du fournisseur à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour un fournisseur
     * @return DTO du fournisseur mis à jour
     */
    ProviderDTO updateProvider(Long id, ProviderRequestDTO requestDTO);

    /**
     * Supprime un fournisseur par son ID
     * 
     * @param id ID du fournisseur à supprimer
     */
    void deleteProvider(Long id);

    /**
     * @param providerId ID du fournisseur
     * @return Liste des fournitures du fournisseur
     */
    List<ProviderProductDTO> getSuppliesByProvider(Long providerId);

    /**
     * Enregistre une nouvelle fourniture
     *
     * @param requestDTO DTO de requête pour la fourniture
     * @return DTO de la fourniture enregistrée
     */
    ProviderProductDTO recordSupply(ProviderProductRequestDTO requestDTO);

    /**
     * Valide une fourniture et met à jour le stock
     *
     * @param supplyId ID de la fourniture
     * @return DTO de la fourniture validée
     */
    ProviderProductDTO validateSupply(Long supplyId);

    /**
     * Récupère toutes les fournitures
     *
     * @return Liste de toutes les fournitures
     */
    List<ProviderProductDTO> getAllSupplies();
}
