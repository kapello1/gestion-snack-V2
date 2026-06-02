package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * DTO pour l'entité Employee
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDTO {
    private Long employeeId;
    private String lastName;
    private String firstName;
    private String username;
    private String address;
    private String phone;
    private String email;
    private Long roleId;
    private String roleName;
    private BigDecimal salary;
    private LocalDate hireDate;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private Boolean isActive;
}

