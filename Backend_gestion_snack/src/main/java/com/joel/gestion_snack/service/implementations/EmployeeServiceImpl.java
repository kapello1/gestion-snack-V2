package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.EmployeeDTO;
import com.joel.gestion_snack.model.dto.EmployeeRequestDTO;
import com.joel.gestion_snack.model.entity.Employee;
import com.joel.gestion_snack.repository.EmployeeRepository;
import com.joel.gestion_snack.service.interfaces.IEmployeeService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des employés
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class EmployeeServiceImpl implements IEmployeeService {

    private final EmployeeRepository employeeRepository;
    private final com.joel.gestion_snack.repository.UserRepository userRepository;
    private final com.joel.gestion_snack.repository.RoleRepository roleRepository;
    private final MapperUtil mapperUtil;

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeDTO> getAllEmployees() {
        log.info("Récupération de tous les employés");
        return employeeRepository.findAll().stream()
                .map(mapperUtil::toEmployeeDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeDTO getEmployeeById(Long id) {
        log.info("Récupération de l'employé avec l'ID: {}", id);
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Employé non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Employé non trouvé avec l'ID: " + id);
                });
        return mapperUtil.toEmployeeDTO(employee);
    }

    @Override
    public EmployeeDTO createEmployee(EmployeeRequestDTO requestDTO) {
        log.info("Création d'un nouvel employé: {}", requestDTO.getEmail());
        if (employeeRepository.findByEmail(requestDTO.getEmail()).isPresent()) {
            log.error("Un employé avec l'email {} existe déjà", requestDTO.getEmail());
            throw new IllegalArgumentException("Un employé avec cet email existe déjà");
        }
        if (employeeRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
            log.error("Un employé avec le username {} existe déjà", requestDTO.getUsername());
            throw new IllegalArgumentException("Un employé avec ce nom d'utilisateur existe déjà");
        }
        // Check if a User already exists with this email or username (to prevent
        // trigger failure)
        if (userRepository.findByEmail(requestDTO.getEmail()).isPresent()) {
            log.error("Un utilisateur avec l'email {} existe déjà", requestDTO.getEmail());
            throw new IllegalArgumentException(
                    "Un utilisateur avec cet email existe déjà. Impossible de créer l'employé.");
        }
        if (userRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
            log.error("Un utilisateur avec le username {} existe déjà", requestDTO.getUsername());
            throw new IllegalArgumentException(
                    "Un utilisateur avec ce nom d'utilisateur existe déjà. Impossible de créer l'employé.");
        }
        Employee employee = mapperUtil.toEmployee(requestDTO);
        com.joel.gestion_snack.model.entity.Role role = roleRepository.findById(requestDTO.getRoleId())
                .orElseThrow(() -> new EntityNotFoundException("Rôle non trouvé avec l'ID: " + requestDTO.getRoleId()));
        employee.setRole(role);
        employee = employeeRepository.save(employee);
        log.info("Employé créé avec succès avec l'ID: {}", employee.getEmployeeId());
        return mapperUtil.toEmployeeDTO(employee);
    }

    @Override
    public EmployeeDTO updateEmployee(Long id, EmployeeRequestDTO requestDTO) {
        log.info("Mise à jour de l'employé avec l'ID: {}", id);
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Employé non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Employé non trouvé avec l'ID: " + id);
                });
        com.joel.gestion_snack.model.entity.Role role = roleRepository.findById(requestDTO.getRoleId())
                .orElseThrow(() -> new EntityNotFoundException("Rôle non trouvé avec l'ID: " + requestDTO.getRoleId()));
        employee.setRole(role);
        employee.setLastName(requestDTO.getLastName());
        employee.setFirstName(requestDTO.getFirstName());
        employee.setUsername(requestDTO.getUsername());
        employee.setAddress(requestDTO.getAddress());
        employee.setPhone(requestDTO.getPhone());
        employee.setEmail(requestDTO.getEmail());
        employee.setSalary(requestDTO.getSalary());
        employee.setHireDate(requestDTO.getHireDate());
        employee.setUpdatedBy(requestDTO.getCreatedBy());
        employee = employeeRepository.save(employee);
        log.info("Employé mis à jour avec succès");
        return mapperUtil.toEmployeeDTO(employee);
    }

    @Override
    public void deleteEmployee(Long id) {
        log.info("Suppression de l'employé avec l'ID: {}", id);
        if (!employeeRepository.existsById(id)) {
            log.error("Employé non trouvé avec l'ID: {}", id);
            throw new EntityNotFoundException("Employé non trouvé avec l'ID: " + id);
        }
        employeeRepository.deleteById(id);
        log.info("Employé supprimé avec succès");
    }
}
