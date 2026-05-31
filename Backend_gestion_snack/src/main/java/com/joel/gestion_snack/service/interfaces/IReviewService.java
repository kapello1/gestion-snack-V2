package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.ReviewDTO;
import com.joel.gestion_snack.model.dto.ReviewRequestDTO;

import java.util.List;

/**
 * Interface du service pour la gestion des avis
 */
public interface IReviewService {
    /**
     * Récupère tous les avis
     * @return Liste de tous les avis
     */
    List<ReviewDTO> getAllReviews();
    
    /**
     * Récupère un avis par son ID
     * @param id ID de l'avis
     * @return DTO de l'avis
     */
    ReviewDTO getReviewById(Long id);
    
    /**
     * Crée un nouvel avis
     * @param requestDTO DTO de requête pour créer un avis
     * @return DTO de l'avis créé
     */
    ReviewDTO createReview(ReviewRequestDTO requestDTO);
    
    /**
     * Met à jour un avis existant
     * @param id ID de l'avis à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour un avis
     * @return DTO de l'avis mis à jour
     */
    ReviewDTO updateReview(Long id, ReviewRequestDTO requestDTO);
    
    /**
     * Supprime un avis par son ID
     * @param id ID de l'avis à supprimer
     */
    void deleteReview(Long id);
    
    /**
     * Récupère les avis d'un client
     * @param customerId ID du client
     * @return Liste des avis du client
     */
    List<ReviewDTO> getReviewsByCustomer(Long customerId);
}

