package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.ReservationDTO;
import com.joel.gestion_snack.model.dto.ReservationRequestDTO;
import com.joel.gestion_snack.model.entity.ReservationStatus;

import java.time.LocalDate;
import java.util.List;

/**
 * Interface du service pour la gestion des réservations
 */
public interface IReservationService {
    /**
     * Récupère toutes les réservations
     * @return Liste de toutes les réservations
     */
    List<ReservationDTO> getAllReservations();
    
    /**
     * Récupère une réservation par son ID
     * @param id ID de la réservation
     * @return DTO de la réservation
     */
    ReservationDTO getReservationById(Long id);
    
    /**
     * Crée une nouvelle réservation
     * @param requestDTO DTO de requête pour créer une réservation
     * @return DTO de la réservation créée
     */
    ReservationDTO createReservation(ReservationRequestDTO requestDTO);
    
    /**
     * Met à jour une réservation existante
     * @param id ID de la réservation à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour une réservation
     * @return DTO de la réservation mise à jour
     */
    ReservationDTO updateReservation(Long id, ReservationRequestDTO requestDTO);
    
    /**
     * Supprime une réservation par son ID
     * @param id ID de la réservation à supprimer
     */
    void deleteReservation(Long id);
    
    /**
     * Récupère les réservations par statut
     * @param status Statut de la réservation
     * @return Liste des réservations avec le statut spécifié
     */
    List<ReservationDTO> getReservationsByStatus(ReservationStatus status);
    
    /**
     * Récupère les réservations par date
     * @param date Date de la réservation
     * @return Liste des réservations de la date spécifiée
     */
    List<ReservationDTO> getReservationsByDate(LocalDate date);
    
    /**
     * Récupère les réservations d'un client
     * @param customerId ID du client
     * @return Liste des réservations du client
     */
    List<ReservationDTO> getReservationsByCustomer(Long customerId);
    
    /**
     * Annule une réservation
     * @param id ID de la réservation à annuler
     * @return DTO de la réservation annulée
     */
    ReservationDTO cancelReservation(Long id);
}

