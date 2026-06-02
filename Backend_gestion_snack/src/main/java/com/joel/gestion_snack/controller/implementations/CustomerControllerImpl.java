package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.controller.interfaces.ICustomerController;
import com.joel.gestion_snack.model.dto.CustomerDTO;
import com.joel.gestion_snack.model.dto.CustomerRequestDTO;
import com.joel.gestion_snack.service.interfaces.ICustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.List;

/**
 * Implémentation du contrôleur pour la gestion des clients
 */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Clients", description = "API pour la gestion des clients")
public class CustomerControllerImpl implements ICustomerController {
    
    private final ICustomerService customerService;
    
    @Override
    @GetMapping
    @Operation(summary = "Récupérer tous les clients")
    public ResponseEntity<List<CustomerDTO>> getAllCustomers() {
        log.info("Requête GET pour récupérer tous les clients");
        List<CustomerDTO> customers = customerService.getAllCustomers();
        return ResponseEntity.ok(customers);
    }
    
    @Override
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un client par son ID")
    public ResponseEntity<CustomerDTO> getCustomerById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer le client avec l'ID: {}", id);
        CustomerDTO customer = customerService.getCustomerById(id);
        return ResponseEntity.ok(customer);
    }
    
    @Override
    @PostMapping
    @Operation(summary = "Créer un nouveau client")
    public ResponseEntity<CustomerDTO> createCustomer(@Valid @RequestBody CustomerRequestDTO requestDTO) {
        log.info("Requête POST pour créer un nouveau client: {}", requestDTO.getEmail());
        CustomerDTO customer = customerService.createCustomer(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(customer);
    }
    
    @Override
    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un client")
    public ResponseEntity<CustomerDTO> updateCustomer(@PathVariable Long id, 
                                                       @Valid @RequestBody CustomerRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour le client avec l'ID: {}", id);
        CustomerDTO customer = customerService.updateCustomer(id, requestDTO);
        return ResponseEntity.ok(customer);
    }
    
    @Override
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un client")
    public ResponseEntity<Void> deleteCustomer(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer le client avec l'ID: {}", id);
        customerService.deleteCustomer(id);
        return ResponseEntity.noContent().build();
    }
    
    @Override
    @GetMapping("/email/{email}")
    @Operation(summary = "Récupérer un client par son email")
    public ResponseEntity<CustomerDTO> getCustomerByEmail(@PathVariable String email) {
        log.info("Requête GET pour récupérer le client avec l'email: {}", email);
        CustomerDTO customer = customerService.getCustomerByEmail(email);
        return ResponseEntity.ok(customer);
    }
    
    @Override
    @GetMapping("/username/{username}")
    @Operation(summary = "Récupérer un client par son nom d'utilisateur")
    public ResponseEntity<CustomerDTO> getCustomerByUsername(@PathVariable String username) {
        log.info("Requête GET pour récupérer le client avec le username: {}", username);
        CustomerDTO customer = customerService.getCustomerByUsername(username);
        return ResponseEntity.ok(customer);
    }

    @GetMapping("/verify/{token}")
    @Operation(summary = "Vérifier l'email d'un client via son token")
    public ResponseEntity<Map<String, String>> verifyEmail(@PathVariable String token) {
        log.info("Requête GET pour vérifier l'email via token");
        customerService.verifyEmail(token);
        return ResponseEntity.ok(Map.of("message", "Email vérifié avec succès ! Vous pouvez maintenant vous connecter."));
    }
}

