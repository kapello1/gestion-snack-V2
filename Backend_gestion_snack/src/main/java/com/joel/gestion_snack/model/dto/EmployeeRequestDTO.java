package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO de requête pour créer/mettre à jour un Employee
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRequestDTO {
    @NotBlank(message = "Le nom est obligatoire")
    private String lastName;
    
    @NotBlank(message = "Le prénom est obligatoire")
    private String firstName;
    
    @NotBlank(message = "Le nom d'utilisateur est obligatoire")
    private String username;
    
    private String address;
    private String phone;
    
    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "L'email doit être valide")
    private String email;
    
    @NotNull(message = "Le rôle est obligatoire")
    private Long roleId;
    
    private BigDecimal salary;
    private LocalDate hireDate;
    private String createdBy;
}

