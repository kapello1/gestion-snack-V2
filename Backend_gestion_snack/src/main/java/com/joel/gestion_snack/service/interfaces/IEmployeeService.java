package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.EmployeeDTO;
import com.joel.gestion_snack.model.dto.EmployeeRequestDTO;

import java.util.List;

/**
 * Interface du service pour la gestion des employés
 */
public interface IEmployeeService {
    /**
     * Récupère tous les employés
     * @return Liste de tous les employés
     */
    List<EmployeeDTO> getAllEmployees();
    
    /**
     * Récupère un employé par son ID
     * @param id ID de l'employé
     * @return DTO de l'employé
     */
    EmployeeDTO getEmployeeById(Long id);
    
    /**
     * Crée un nouvel employé
     * @param requestDTO DTO de requête pour créer un employé
     * @return DTO de l'employé créé
     */
    EmployeeDTO createEmployee(EmployeeRequestDTO requestDTO);
    
    /**
     * Met à jour un employé existant
     * @param id ID de l'employé à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour un employé
     * @return DTO de l'employé mis à jour
     */
    EmployeeDTO updateEmployee(Long id, EmployeeRequestDTO requestDTO);
    
    /**
     * Supprime un employé par son ID
     * @param id ID de l'employé à supprimer
     */
    void deleteEmployee(Long id);

    /**
     * Active ou désactive le compte d'un employé (soft delete via User.isActive)
     * @param id ID de l'employé
     * @param active true pour activer, false pour désactiver
     * @return DTO de l'employé mis à jour
     */
    EmployeeDTO toggleActiveStatus(Long id, boolean active);
}

