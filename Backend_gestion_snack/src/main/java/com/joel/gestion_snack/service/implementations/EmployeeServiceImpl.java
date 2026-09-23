package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.EmployeeDTO;
import com.joel.gestion_snack.model.dto.EmployeeRequestDTO;
import com.joel.gestion_snack.model.entity.Employee;
import com.joel.gestion_snack.config.WebSocketEventPublisher;
import com.joel.gestion_snack.model.entity.RoleType;
import com.joel.gestion_snack.repository.EmployeeRepository;
import com.joel.gestion_snack.security.SecurityUtils;
import com.joel.gestion_snack.security.UserSessionService;
import com.joel.gestion_snack.service.EmailService;
import com.joel.gestion_snack.service.interfaces.IEmployeeService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.concurrent.CompletableFuture;
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
    private final WebSocketEventPublisher wsPublisher;
    private final EmailService emailService;
    private final UserSessionService userSessionService;

    /** Mot de passe initial posé par le trigger PostgreSQL trg_employee_after_insert (snack_db_postgres.sql). */
    static final String DEFAULT_PASSWORD = "1234";

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeDTO> getAllEmployees() {
        log.info("Récupération de tous les employés");
        return employeeRepository.findAll().stream()
                .map(this::toEmployeeDTOWithStatus)
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
        return toEmployeeDTOWithStatus(employee);
    }

    private EmployeeDTO toEmployeeDTOWithStatus(Employee employee) {
        EmployeeDTO dto = mapperUtil.toEmployeeDTO(employee);
        // Lookup par ownerId (robuste meme si l'email a change dans la table users)
        userRepository.findFirstByOwnerId(employee.getEmployeeId())
                .ifPresentOrElse(
                        user -> dto.setIsActive(Boolean.TRUE.equals(user.getIsActive())),
                        () -> dto.setIsActive(true));
        return dto;
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
        wsPublisher.publishUserEvent("USER_CREATED", employee.getEmployeeId());
        sendWelcomeEmailAfterCommit(employee, role);
        return mapperUtil.toEmployeeDTO(employee);
    }

    /**
     * Le compte de connexion est créé par le trigger PostgreSQL avec le mot de passe par défaut.
     * L'email d'accueil n'est envoyé qu'une fois la transaction validée (jamais pour un employé finalement
     * annulé), en tâche de fond pour ne pas ralentir la réponse, et n'échoue jamais la création.
     */
    private void sendWelcomeEmailAfterCommit(Employee employee, com.joel.gestion_snack.model.entity.Role role) {
        String username = userRepository.findFirstByOwnerId(employee.getEmployeeId())
                .map(com.joel.gestion_snack.model.entity.User::getUsername)
                .orElse(null);
        if (username == null) {
            log.warn("Email d'accueil non envoyé : aucun compte utilisateur lié à l'employé {}", employee.getEmployeeId());
            return;
        }
        final String email = employee.getEmail();
        final String firstName = employee.getFirstName();
        final RoleType roleType = role.getRoleName();
        Runnable send = () -> CompletableFuture.runAsync(() -> {
            try {
                emailService.sendEmployeeWelcomeEmail(email, firstName, username, roleType, DEFAULT_PASSWORD);
            } catch (RuntimeException e) {
                log.error("Échec de l'email d'accueil pour {} : {}", email, e.getMessage());
            }
        });
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }

    @Override
    public EmployeeDTO updateEmployee(Long id, EmployeeRequestDTO requestDTO) {
        log.info("Mise à jour de l'employé avec l'ID: {}", id);
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Employé non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Employé non trouvé avec l'ID: " + id);
                });
        // Seul un administrateur peut changer le rôle, le salaire ou la date d'embauche : sans cette garde,
        // un employé pourrait se promouvoir ADMIN en modifiant son propre profil (PUT /api/employees/{id}).
        final boolean privileged = SecurityUtils.isAdmin();
        com.joel.gestion_snack.model.entity.Role role = privileged
                ? roleRepository.findById(requestDTO.getRoleId())
                        .orElseThrow(() -> new EntityNotFoundException("Rôle non trouvé avec l'ID: " + requestDTO.getRoleId()))
                : employee.getRole();
        employee.setRole(role);
        employee.setLastName(requestDTO.getLastName());
        employee.setFirstName(requestDTO.getFirstName());
        employee.setUsername(requestDTO.getUsername());
        employee.setAddress(requestDTO.getAddress());
        employee.setPhone(requestDTO.getPhone());
        employee.setEmail(requestDTO.getEmail());
        if (privileged) {
            employee.setSalary(requestDTO.getSalary());
            employee.setHireDate(requestDTO.getHireDate());
        }
        employee.setUpdatedBy(requestDTO.getCreatedBy());
        employee = employeeRepository.save(employee);
        log.info("Employé mis à jour avec succès");

        // Synchroniser le role sur l'utilisateur lie
        final com.joel.gestion_snack.model.entity.Role syncedRole = role;
        userRepository.findFirstByOwnerId(employee.getEmployeeId()).ifPresent(u -> {
            u.setRole(syncedRole);
            u.setUpdatedBy("ADMIN");
            userRepository.save(u);
            userSessionService.evict(u.getUserId());
        });

        wsPublisher.publishUserEvent("USER_UPDATED", employee.getEmployeeId());
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
        wsPublisher.publishUserEvent("USER_DELETED", id);
    }

    @Override
    public EmployeeDTO toggleActiveStatus(Long id, boolean active) {
        log.info("{} l'employé avec l'ID: {}", active ? "Activation de" : "Désactivation de", id);
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Employé non trouvé avec l'ID: " + id));

        // Mettre à jour le User correspondant via ownerId (robuste meme si email diverge)
        userRepository.findFirstByOwnerId(employee.getEmployeeId()).ifPresent(user -> {
            user.setIsActive(active);
            user.setUpdatedBy("ADMIN");
            userRepository.save(user);
            userSessionService.evict(user.getUserId());
        });

        log.info("Statut de l'employé {} mis à jour à isActive={}", id, active);
        wsPublisher.publishUserEvent(active ? "USER_ACTIVATED" : "USER_DEACTIVATED", id);
        return toEmployeeDTOWithStatus(employee);
    }
}
