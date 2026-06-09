package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.LoginRequestDTO;
import com.joel.gestion_snack.model.dto.LoginResponseDTO;
import com.joel.gestion_snack.model.dto.UserDTO;
import com.joel.gestion_snack.model.dto.UserRequestDTO;
import com.joel.gestion_snack.model.dto.UserUpdateRequestDTO;
import com.joel.gestion_snack.model.entity.Role;
import com.joel.gestion_snack.model.entity.RoleType;
import com.joel.gestion_snack.model.entity.User;
import com.joel.gestion_snack.repository.CustomerRepository;
import com.joel.gestion_snack.repository.EmployeeRepository;
import com.joel.gestion_snack.repository.OrderRepository;
import com.joel.gestion_snack.repository.ReservationRepository;
import com.joel.gestion_snack.repository.ReviewRepository;
import com.joel.gestion_snack.repository.RoleRepository;
import com.joel.gestion_snack.repository.UserRepository;
import com.joel.gestion_snack.service.EmailService;
import com.joel.gestion_snack.service.interfaces.IUserService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des utilisateurs et
 * l'authentification
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserServiceImpl implements IUserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CustomerRepository customerRepository;
    private final EmployeeRepository employeeRepository;
    private final OrderRepository orderRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;
    private final MapperUtil mapperUtil;
    private final EntityManager entityManager;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    @Transactional(readOnly = true)
    public LoginResponseDTO authenticate(LoginRequestDTO loginRequest) {
        log.info("Tentative d'authentification pour l'utilisateur: {}", loginRequest.getUsername());

        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> {
                    log.error("Utilisateur non trouvé: {}", loginRequest.getUsername());
                    return new EntityNotFoundException("Nom d'utilisateur ou mot de passe incorrect");
                });

        // Vérifier si l'utilisateur est un fournisseur (PROVIDER)
        if (user.getRole().getRoleName() == RoleType.PROVIDER) {
            log.warn("Tentative de connexion d'un fournisseur rejetée: {}", loginRequest.getUsername());
            throw new IllegalArgumentException("L'accès est restreint pour les fournisseurs.");
        }

        // Vérifier si le compte est actif
        if (Boolean.FALSE.equals(user.getIsActive())) {
            log.warn("Tentative de connexion sur un compte inactif: {}", loginRequest.getUsername());
            throw new IllegalArgumentException("Compte inactif. Veuillez vérifier votre email ou contacter l'administrateur.");
        }

        // Vérifier le mot de passe
        // Note: Les mots de passe dans la base sont cryptés avec pgcrypto (crypt)
        // Pour la vérification, nous devons utiliser BCrypt qui est compatible
        // ou utiliser une fonction PostgreSQL pour vérifier

        // Vérification simple avec BCrypt (si le mot de passe a été hashé avec BCrypt)
        // Sinon, on peut utiliser une requête SQL directe pour vérifier avec crypt()
        boolean passwordMatches = verifyPassword(loginRequest.getPassword(), user.getPassword());

        if (!passwordMatches) {
            log.error("Mot de passe incorrect pour l'utilisateur: {}", loginRequest.getUsername());
            throw new IllegalArgumentException("Nom d'utilisateur ou mot de passe incorrect");
        }

        log.info("Authentification réussie pour l'utilisateur: {}", loginRequest.getUsername());

        LoginResponseDTO response = new LoginResponseDTO();
        response.setUserId(user.getUserId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setRoleName(user.getRole().getRoleName().name());
        response.setRoleId(user.getRole().getRoleId());
        response.setOwnerId(user.getOwnerId());
        response.setSuccess(true);
        response.setMessage("Authentification réussie");

        return response;
    }

    /**
     * Vérifie le mot de passe
     * Note: Les mots de passe dans la base peuvent être cryptés avec
     * pgcrypto.crypt() ou BCrypt
     * Cette méthode tente d'abord BCrypt, puis utilise une vérification SQL avec
     * crypt()
     */
    private boolean verifyPassword(String rawPassword, String hashedPassword) {
        // Essayer BCrypt d'abord (pour les nouveaux mots de passe hashés avec BCrypt)
        try {
            if (passwordEncoder.matches(rawPassword, hashedPassword)) {
                log.debug("Mot de passe vérifié avec BCrypt");
                return true;
            }
        } catch (Exception e) {
            log.debug("BCrypt verification failed, trying PostgreSQL crypt");
        }

        // Si BCrypt échoue, le hash est probablement fait avec pgcrypto.crypt()
        // Utiliser une requête SQL native pour vérifier avec crypt()
        try {
            Query query = entityManager.createNativeQuery(
                    "SELECT crypt(:password, :hash) = :hash AS password_match");
            query.setParameter("password", rawPassword);
            query.setParameter("hash", hashedPassword);

            Boolean result = (Boolean) query.getSingleResult();
            if (Boolean.TRUE.equals(result)) {
                log.debug("Mot de passe vérifié avec PostgreSQL crypt()");
                return true;
            }
        } catch (Exception e) {
            log.warn("Erreur lors de la vérification du mot de passe avec crypt(): {}", e.getMessage());
        }

        return false;
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDTO> getAllUsers() {
        log.info("Récupération de tous les utilisateurs");
        List<User> users = userRepository.findAll();
        log.debug("Nombre d'utilisateurs trouvés: {}", users.size());
        return users.stream()
                .map(mapperUtil::toUserDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserById(Long id) {
        log.info("Récupération de l'utilisateur avec l'ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Utilisateur non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Utilisateur non trouvé avec l'ID: " + id);
                });
        return mapperUtil.toUserDTO(user);
    }

    @Override
    public UserDTO createUser(UserRequestDTO requestDTO) {
        log.info("Création d'un nouvel utilisateur: {}", requestDTO.getUsername());

        // Vérifier si le username existe déjà
        if (userRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
            log.error("Un utilisateur avec le username {} existe déjà", requestDTO.getUsername());
            throw new IllegalArgumentException("Un utilisateur avec ce nom d'utilisateur existe déjà");
        }

        // Vérifier si l'email existe déjà
        if (userRepository.findByEmail(requestDTO.getEmail()).isPresent()) {
            log.error("Un utilisateur avec l'email {} existe déjà", requestDTO.getEmail());
            throw new IllegalArgumentException("Un utilisateur avec cet email existe déjà");
        }

        // Récupérer le rôle
        Role role = roleRepository.findById(requestDTO.getRoleId())
                .orElseThrow(() -> {
                    log.error("Rôle non trouvé avec l'ID: {}", requestDTO.getRoleId());
                    return new EntityNotFoundException("Rôle non trouvé avec l'ID: " + requestDTO.getRoleId());
                });

        User user = new User();
        user.setOwnerId(requestDTO.getOwnerId());
        user.setUsername(requestDTO.getUsername());
        // Hasher le mot de passe avec BCrypt
        user.setPassword(passwordEncoder.encode(requestDTO.getPassword()));
        user.setEmail(requestDTO.getEmail());
        user.setRole(role);
        user.setPinUpToDate(requestDTO.getPinUpToDate() != null ? requestDTO.getPinUpToDate() : false);
        user.setCreatedBy(requestDTO.getCreatedBy());

        user = userRepository.save(user);
        log.info("Utilisateur créé avec succès avec l'ID: {}", user.getUserId());
        return mapperUtil.toUserDTO(user);
    }

    @Override
    @Transactional
    public UserDTO updateUser(Long id, UserUpdateRequestDTO requestDTO) {
        log.info("[UPDATE_USER] Début — userId={} username={} email={} roleId={} ownerId={}",
                id, requestDTO.getUsername(), requestDTO.getEmail(),
                requestDTO.getRoleId(), requestDTO.getOwnerId());

        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("[UPDATE_USER] Utilisateur non trouvé ID={}", id);
                    return new EntityNotFoundException("Utilisateur non trouvé avec l'ID: " + id);
                });

        if (!user.getUsername().equals(requestDTO.getUsername())) {
            if (userRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
                throw new IllegalArgumentException("Un utilisateur avec ce nom d'utilisateur existe déjà");
            }
        }

        if (!user.getEmail().equals(requestDTO.getEmail())) {
            if (userRepository.findByEmail(requestDTO.getEmail()).isPresent()) {
                throw new IllegalArgumentException("Un utilisateur avec cet email existe déjà");
            }
        }

        if (requestDTO.getOwnerId() != null) {
            user.setOwnerId(requestDTO.getOwnerId());
        }
        user.setUsername(requestDTO.getUsername());
        if (requestDTO.getPassword() != null && !requestDTO.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(requestDTO.getPassword()));
        }
        user.setEmail(requestDTO.getEmail());
        if (requestDTO.getRoleId() != null) {
            Role role = roleRepository.findById(requestDTO.getRoleId())
                    .orElseThrow(() -> new EntityNotFoundException("Rôle non trouvé ID=" + requestDTO.getRoleId()));
            user.setRole(role);
        }
        if (requestDTO.getPinUpToDate() != null) {
            user.setPinUpToDate(requestDTO.getPinUpToDate());
        }
        user.setUpdatedBy(requestDTO.getCreatedBy());

        user = userRepository.save(user);
        log.info("[UPDATE_USER] Succès — userId={}", user.getUserId());
        return mapperUtil.toUserDTO(user);
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deleteUser(Long id) {
        log.info("Suppression en cascade de l'utilisateur avec l'ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur non trouvé avec l'ID: " + id));

        RoleType role = user.getRole() != null ? user.getRole().getRoleName() : null;

        if (role == RoleType.CUSTOMER) {
            customerRepository.findById(user.getOwnerId()).ifPresent(customer -> {
                Long customerId = customer.getCustomerId();
                // Détacher les commandes — flush immédiat pour satisfaire ON DELETE RESTRICT
                orderRepository.findByCustomer_CustomerId(customerId).forEach(order -> {
                    order.setCustomer(null);
                    orderRepository.save(order);
                });
                entityManager.flush(); // force UPDATE orders SET customer_id=NULL avant DELETE customers
                reservationRepository.findByCustomer_CustomerId(customerId)
                        .forEach(r -> reservationRepository.deleteById(r.getReservationId()));
                reviewRepository.findByCustomer_CustomerId(customerId)
                        .forEach(r -> reviewRepository.deleteById(r.getReviewId()));
                customerRepository.deleteById(customerId);
                log.info("Client ID {} supprimé en cascade", customerId);
            });
        } else if (role != null && role != RoleType.ADMIN && role != RoleType.PROVIDER) {
            employeeRepository.findById(user.getOwnerId()).ifPresent(emp -> {
                employeeRepository.deleteById(emp.getEmployeeId());
                log.info("Employé ID {} supprimé en cascade", emp.getEmployeeId());
            });
        }

        // Flush toutes les opérations en attente, puis supprime l'utilisateur par ID
        entityManager.flush();
        userRepository.deleteById(id);
        log.info("Utilisateur supprimé avec succès avec l'ID: {}", id);
    }

    @Override
    public UserDTO changePassword(Long id, String newPassword) {
        log.info("Changement de mot de passe pour l'utilisateur avec l'ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Utilisateur non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Utilisateur non trouvé avec l'ID: " + id);
                });

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPinUpToDate(true);
        user.setUpdatedBy("SYSTEM");

        user = userRepository.save(user);
        log.info("Mot de passe changé avec succès pour l'utilisateur avec l'ID: {}", id);
        return mapperUtil.toUserDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDTO getUserByUsername(String username) {
        log.info("Récupération de l'utilisateur avec le username: {}", username);
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.error("Utilisateur non trouvé avec le username: {}", username);
                    return new EntityNotFoundException("Utilisateur non trouvé avec le username: " + username);
                });
        return mapperUtil.toUserDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDTO> getUsersByRole(Long roleId) {
        log.info("Récupération des utilisateurs avec le rôle ID: {}", roleId);
        List<User> users = userRepository.findAll().stream()
                .filter(u -> u.getRole().getRoleId().equals(roleId))
                .collect(Collectors.toList());
        log.debug("Nombre d'utilisateurs trouvés: {}", users.size());
        return users.stream()
                .map(mapperUtil::toUserDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void forgotPassword(String email) {
        log.info("Demande de réinitialisation de mot de passe pour l'email: {}", email);
        User user = userRepository.findByEmail(email).orElse(null);
        // Ne pas révéler si l'email existe ou non (sécurité)
        if (user == null) {
            log.warn("Aucun utilisateur trouvé pour l'email: {} (réponse silencieuse)", email);
            return;
        }
        String token = UUID.randomUUID().toString();
        user.setResetPasswordToken(token);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);
        RoleType role = user.getRole() != null ? user.getRole().getRoleName() : null;
        String firstName;
        if (role == RoleType.CUSTOMER) {
            firstName = customerRepository.findById(user.getOwnerId())
                    .map(c -> c.getFirstName())
                    .orElse(user.getUsername());
        } else if (role != null && role != RoleType.PROVIDER) {
            firstName = employeeRepository.findById(user.getOwnerId())
                    .map(e -> e.getFirstName())
                    .orElse(user.getUsername());
        } else {
            firstName = user.getUsername();
        }
        boolean sent = emailService.sendPasswordResetEmail(user.getEmail(), token, firstName);
        if (sent) {
            log.info("Email de réinitialisation envoyé à: {}", email);
        } else {
            log.warn("Email de réinitialisation non envoyé à: {} — vérifier MAIL_PASSWORD", email);
        }
    }

    @Override
    public void resetPasswordByToken(String token, String newPassword) {
        log.info("Réinitialisation du mot de passe via token");
        User user = userRepository.findByResetPasswordToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Token invalide ou expiré"));
        if (user.getResetPasswordTokenExpiry() == null ||
                user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Le lien de réinitialisation a expiré. Veuillez en demander un nouveau.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        user.setPinUpToDate(true);
        user.setUpdatedBy("SYSTEM");
        userRepository.save(user);
        log.info("Mot de passe réinitialisé avec succès via token");
    }

    @Override
    public UserDTO deactivateUser(Long id) {
        log.info("Désactivation de l'utilisateur avec l'ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur non trouvé avec l'ID: " + id));
        user.setIsActive(false);
        user.setUpdatedBy("ADMIN");
        user = userRepository.save(user);
        log.info("Utilisateur désactivé avec succès: {}", id);
        return mapperUtil.toUserDTO(user);
    }

    @Override
    public UserDTO activateUser(Long id) {
        log.info("Activation de l'utilisateur avec l'ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur non trouvé avec l'ID: " + id));
        user.setIsActive(true);
        user.setUpdatedBy("ADMIN");
        user = userRepository.save(user);
        log.info("Utilisateur activé avec succès: {}", id);
        return mapperUtil.toUserDTO(user);
    }
}
