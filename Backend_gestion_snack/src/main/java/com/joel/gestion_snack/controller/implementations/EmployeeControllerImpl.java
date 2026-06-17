package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.EmployeeDTO;
import com.joel.gestion_snack.model.dto.EmployeeRequestDTO;
import com.joel.gestion_snack.service.interfaces.IEmployeeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Implémentation du contrôleur pour la gestion des employés
 */
@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Employés", description = "API pour la gestion des employés")
public class EmployeeControllerImpl {
    
    private final IEmployeeService employeeService;
    
    @GetMapping
    @Operation(summary = "Récupérer tous les employés")
    public ResponseEntity<List<EmployeeDTO>> getAllEmployees() {
        log.info("Requête GET pour récupérer tous les employés");
        return ResponseEntity.ok(employeeService.getAllEmployees());
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un employé par son ID")
    public ResponseEntity<EmployeeDTO> getEmployeeById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer l'employé avec l'ID: {}", id);
        return ResponseEntity.ok(employeeService.getEmployeeById(id));
    }
    
    @PostMapping
    @Operation(summary = "Créer un nouvel employé")
    public ResponseEntity<EmployeeDTO> createEmployee(@Valid @RequestBody EmployeeRequestDTO requestDTO) {
        log.info("Requête POST pour créer un nouvel employé");
        EmployeeDTO employee = employeeService.createEmployee(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(employee);
    }
    
    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un employé")
    public ResponseEntity<EmployeeDTO> updateEmployee(@PathVariable Long id, 
                                                       @Valid @RequestBody EmployeeRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour l'employé avec l'ID: {}", id);
        return ResponseEntity.ok(employeeService.updateEmployee(id, requestDTO));
    }
    
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un employé")
    public ResponseEntity<Void> deleteEmployee(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer l'employé avec l'ID: {}", id);
        employeeService.deleteEmployee(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/deactivate")
    @Operation(summary = "Désactiver un employé (soft delete - bloque la connexion)")
    public ResponseEntity<EmployeeDTO> deactivateEmployee(@PathVariable Long id) {
        log.info("Requête PATCH pour désactiver l'employé avec l'ID: {}", id);
        return ResponseEntity.ok(employeeService.toggleActiveStatus(id, false));
    }

    @PatchMapping("/{id}/activate")
    @Operation(summary = "Réactiver un employé")
    public ResponseEntity<EmployeeDTO> activateEmployee(@PathVariable Long id) {
        log.info("Requête PATCH pour activer l'employé avec l'ID: {}", id);
        return ResponseEntity.ok(employeeService.toggleActiveStatus(id, true));
    }
}

