package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.StockAlertDTO;

import java.util.List;

/**
 * Interface du service pour la gestion des alertes de stock
 */
public interface IStockAlertService {
    /**
     * Récupère toutes les alertes de stock
     * @return Liste de toutes les alertes
     */
    List<StockAlertDTO> getAllAlerts();
    
    /**
     * Récupère une alerte par son ID
     * @param id ID de l'alerte
     * @return DTO de l'alerte
     */
    StockAlertDTO getAlertById(Long id);
    
    /**
     * Récupère les alertes non résolues
     * @return Liste des alertes non résolues
     */
    List<StockAlertDTO> getUnresolvedAlerts();
    
    /**
     * Marque une alerte comme résolue
     * @param id ID de l'alerte
     * @return DTO de l'alerte mise à jour
     */
    StockAlertDTO resolveAlert(Long id);
    
    /**
     * Récupère les alertes d'un produit
     * @param productId ID du produit
     * @return Liste des alertes du produit
     */
    List<StockAlertDTO> getAlertsByProduct(Long productId);

    /**
     * Crée une alerte manuelle déclenchée par le cuisinier.
     * @param productId         ID du produit concerné
     * @param requestedQuantity Quantité souhaitée par le cuisinier
     * @param message           Message explicatif du cuisinier
     * @param triggeredBy       Nom de l'utilisateur (cuisinier)
     */
    StockAlertDTO createManualAlert(Long productId, Integer requestedQuantity, String message, String triggeredBy);
}

