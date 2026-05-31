package com.joel.gestion_snack.controller.interfaces;

import com.joel.gestion_snack.model.dto.CustomerDTO;
import com.joel.gestion_snack.model.dto.CustomerRequestDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;

import java.util.List;

/**
 * Interface du contrôleur pour la gestion des clients
 */
@Tag(name = "Clients", description = "API pour la gestion des clients")
public interface ICustomerController {
    
    @Operation(summary = "Récupérer tous les clients")
    ResponseEntity<List<CustomerDTO>> getAllCustomers();
    
    @Operation(summary = "Récupérer un client par son ID")
    ResponseEntity<CustomerDTO> getCustomerById(Long id);
    
    @Operation(summary = "Créer un nouveau client")
    ResponseEntity<CustomerDTO> createCustomer(@Valid CustomerRequestDTO requestDTO);
    
    @Operation(summary = "Mettre à jour un client")
    ResponseEntity<CustomerDTO> updateCustomer(Long id, @Valid CustomerRequestDTO requestDTO);
    
    @Operation(summary = "Supprimer un client")
    ResponseEntity<Void> deleteCustomer(Long id);
    
    @Operation(summary = "Récupérer un client par son email")
    ResponseEntity<CustomerDTO> getCustomerByEmail(String email);
    
    @Operation(summary = "Récupérer un client par son nom d'utilisateur")
    ResponseEntity<CustomerDTO> getCustomerByUsername(String username);
}

