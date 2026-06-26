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
import com.joel.gestion_snack.config.WebSocketEventPublisher;
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
import java.util.Random;
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
    private final WebSocketEventPublisher wsPublisher;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    @Transactional
    public LoginResponseDTO authenticate(LoginRequestDTO loginRequest) {
        log.info("Tentative d'authentification pour l'utilisateur: {}", loginRequest.getUsername());

        User user = userRepository.findByUsername(loginRequest.getUsername())
                .orElseThrow(() -> {
                    log.error("Utilisateur non trouvé: {}", loginRequest.getUsername());
                    return new EntityNotFoundException("Nom d'utilisateur ou mot de passe incorrect");
                });

        if (Boolean.FALSE.equals(user.getIsActive())) {
            log.warn("Tentative de connexion sur un compte inactif: {}", loginRequest.getUsername());
            throw new IllegalArgumentException("Compte inactif. Veuillez vérifier votre email ou contacter l'administrateur.");
        }

        boolean passwordMatches = verifyPassword(loginRequest.getPassword(), user.getPassword());
        if (!passwordMatches) {
            log.error("Mot de passe incorrect pour l'utilisateur: {}", loginRequest.getUsername());
            throw new IllegalArgumentException("Nom d'utilisateur ou mot de passe incorrect");
        }

        // Générer et envoyer le code 2FA — la session n'est créée qu'après validation
        String twoFactorCode = String.format("%06d", new Random().nextInt(1_000_000));
        user.setTwoFactorCode(twoFactorCode);
        user.setTwoFactorCodeExpiry(LocalDateTime.now().plusMinutes(10));
        user.setTwoFactorAttempts(0);
        userRepository.save(user);

        String firstName = resolveFirstName(user);
        boolean sent = emailService.send2FACodeEmail(user.getEmail(), twoFactorCode, firstName);
        if (!sent) log.warn("Email 2FA non envoyé pour: {}", user.getUsername());
        log.info("Code 2FA envoyé à {} pour: {}", user.getEmail(), user.getUsername());

        LoginResponseDTO pending = new LoginResponseDTO();
        pending.setSuccess(false);
        pending.setRequiresTwoFactor(true);
        pending.setTwoFactorUserId(user.getUserId());
        pending.setMessage("Un code de vérification a été envoyé à votre adresse email.");
        return pending;
    }

    private LoginResponseDTO buildSuccessResponse(User user) {
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

    private static final int MAX_2FA_ATTEMPTS = 5;

    @Override
    public LoginResponseDTO verify2FACode(Long userId, String code) {
        log.info("Vérification du code 2FA pour l'utilisateur ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur non trouvé"));

        // Trop de tentatives : invalider le code et forcer une nouvelle connexion
        int attempts = user.getTwoFactorAttempts() != null ? user.getTwoFactorAttempts() : 0;
        if (attempts >= MAX_2FA_ATTEMPTS) {
            user.setTwoFactorCode(null);
            user.setTwoFactorCodeExpiry(null);
            user.setTwoFactorAttempts(0);
            userRepository.save(user);
            log.warn("Trop de tentatives 2FA pour l'utilisateur ID: {}", userId);
            throw new IllegalArgumentException("Trop de tentatives échouées. Veuillez vous reconnecter depuis le début.");
        }

        // Expiration
        if (user.getTwoFactorCodeExpiry() == null ||
                user.getTwoFactorCodeExpiry().isBefore(LocalDateTime.now())) {
            user.setTwoFactorCode(null);
            user.setTwoFactorCodeExpiry(null);
            user.setTwoFactorAttempts(0);
            userRepository.save(user);
            log.warn("Code 2FA expiré pour l'utilisateur ID: {}", userId);
            throw new IllegalArgumentException("Code expiré. Veuillez vous reconnecter.");
        }

        // Code incorrect : incrémenter le compteur
        if (user.getTwoFactorCode() == null || !user.getTwoFactorCode().equals(code)) {
            user.setTwoFactorAttempts(attempts + 1);
            userRepository.save(user);
            int remaining = MAX_2FA_ATTEMPTS - (attempts + 1);
            log.warn("Code 2FA incorrect pour l'utilisateur ID: {} ({} tentative(s) restante(s))", userId, remaining);
            if (remaining <= 0) {
                user.setTwoFactorCode(null);
                user.setTwoFactorCodeExpiry(null);
                user.setTwoFactorAttempts(0);
                userRepository.save(user);
                throw new IllegalArgumentException("Trop de tentatives échouées. Veuillez vous reconnecter depuis le début.");
            }
            throw new IllegalArgumentException("Code incorrect. " + remaining + " tentative(s) restante(s).");
        }

        // Succès : réinitialiser tout
        user.setTwoFactorCode(null);
        user.setTwoFactorCodeExpiry(null);
        user.setTwoFactorAttempts(0);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        log.info("Code 2FA validé avec succès pour l'utilisateur ID: {}", userId);
        return buildSuccessResponse(user);
    }

    @Override
    public void resend2FACode(Long userId) {
        log.info("Renvoi du code 2FA pour l'utilisateur ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("Utilisateur non trouvé"));

        String code = String.format("%06d", new Random().nextInt(1_000_000));
        user.setTwoFactorCode(code);
        user.setTwoFactorCodeExpiry(LocalDateTime.now().plusMinutes(10));
        user.setTwoFactorAttempts(0);
        userRepository.save(user);

        String firstName = resolveFirstName(user);
        boolean sent = emailService.send2FACodeEmail(user.getEmail(), code, firstName);
        if (!sent) {
            log.warn("Email 2FA (renvoi) non envoyé pour l'utilisateur ID: {}", userId);
        }
        log.info("Nouveau code 2FA envoyé pour l'utilisateur ID: {}", userId);
    }

    private String resolveFirstName(User user) {
        RoleType role = user.getRole() != null ? user.getRole().getRoleName() : null;
        if (role == RoleType.CUSTOMER) {
            return customerRepository.findById(user.getOwnerId())
                    .map(c -> c.getFirstName()).orElse(user.getUsername());
        } else if (role != null && role != RoleType.PROVIDER) {
            return employeeRepository.findById(user.getOwnerId())
                    .map(e -> e.getFirstName()).orElse(user.getUsername());
        }
        return user.getUsername();
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
        wsPublisher.publishUserEvent("USER_CREATED", user.getUserId());
        return mapperUtil.toUserDTO(user);
    }

    @Override
    @Transactional
    public UserDTO updateUser(Long id, UserUpdateRequestDTO requestDTO) {
        log.info("[UPDATE_USER] Début - userId={} username={} email={} roleId={} ownerId={}",
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
        log.info("[UPDATE_USER] Succès - userId={}", user.getUserId());
        wsPublisher.publishUserEvent("USER_UPDATED", user.getUserId());
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
                // Détacher les commandes - flush immédiat pour satisfaire ON DELETE RESTRICT
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

        entityManager.flush();
        userRepository.deleteById(id);
        log.info("Utilisateur supprimé avec succès avec l'ID: {}", id);
        wsPublisher.publishUserEvent("USER_DELETED", id);
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
    public void forgotPassword(String email) {
        log.info("Demande de réinitialisation de mot de passe pour l'email: {}", email);
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.warn("Aucun utilisateur trouvé pour l'email: {} (réponse silencieuse)", email);
            return;
        }
        // Code 6 chiffres valable 15 minutes
        String code = String.format("%06d", new Random().nextInt(1_000_000));
        user.setResetPasswordToken(code);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);
        String firstName = resolveFirstName(user);
        boolean sent = emailService.send2FACodeEmail(user.getEmail(), code, firstName);
        if (sent) {
            log.info("Code de réinitialisation envoyé à: {}", email);
        } else {
            log.warn("Code de réinitialisation non envoyé à: {}", email);
        }
    }

    @Override
    public String verifyResetCode(String email, String code) {
        log.info("Vérification du code de réinitialisation pour: {}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Aucun compte associé à cet email"));

        if (user.getResetPasswordToken() == null || !user.getResetPasswordToken().equals(code)) {
            throw new IllegalArgumentException("Code de vérification incorrect");
        }
        if (user.getResetPasswordTokenExpiry() == null ||
                user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            user.setResetPasswordToken(null);
            user.setResetPasswordTokenExpiry(null);
            userRepository.save(user);
            throw new IllegalArgumentException("Code expiré. Veuillez refaire une demande.");
        }

        // Le code est valide : générer un token UUID sécurisé pour la réinitialisation
        String resetToken = UUID.randomUUID().toString();
        user.setResetPasswordToken(resetToken);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        log.info("Code réinitialisation validé, token UUID généré pour: {}", email);
        return resetToken;
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
        wsPublisher.publishUserEvent("USER_DEACTIVATED", user.getUserId());
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
        wsPublisher.publishUserEvent("USER_ACTIVATED", user.getUserId());
        return mapperUtil.toUserDTO(user);
    }
}
