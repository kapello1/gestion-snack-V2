package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.DiningTableDTO;
import com.joel.gestion_snack.model.dto.DiningTableRequestDTO;
import com.joel.gestion_snack.model.entity.TableStatusType;

import java.util.List;

/**
 * Interface du service pour la gestion des tables
 */
public interface IDiningTableService {
    /**
     * Récupère toutes les tables
     * @return Liste de toutes les tables
     */
    List<DiningTableDTO> getAllTables();
    
    /**
     * Récupère une table par son ID
     * @param id ID de la table
     * @return DTO de la table
     */
    DiningTableDTO getTableById(Long id);
    
    /**
     * Crée une nouvelle table
     * @param requestDTO DTO de requête pour créer une table
     * @return DTO de la table créée
     */
    DiningTableDTO createTable(DiningTableRequestDTO requestDTO);
    
    /**
     * Met à jour une table existante
     * @param id ID de la table à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour une table
     * @return DTO de la table mise à jour
     */
    DiningTableDTO updateTable(Long id, DiningTableRequestDTO requestDTO);
    
    /**
     * Supprime une table par son ID
     * @param id ID de la table à supprimer
     */
    void deleteTable(Long id);
    
    /**
     * Récupère les tables par statut
     * @param status Statut de la table
     * @return Liste des tables avec le statut spécifié
     */
    List<DiningTableDTO> getTablesByStatus(TableStatusType status);
    
    /**
     * Change le statut d'une table
     * @param id ID de la table
     * @param status Nouveau statut
     * @return DTO de la table mise à jour
     */
    DiningTableDTO updateTableStatus(Long id, TableStatusType status);
}

