package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.LoginRequestDTO;
import com.joel.gestion_snack.model.dto.LoginResponseDTO;
import com.joel.gestion_snack.model.dto.UserDTO;
import com.joel.gestion_snack.model.dto.UserRequestDTO;
import com.joel.gestion_snack.model.entity.Role;
import com.joel.gestion_snack.model.entity.RoleType;
import com.joel.gestion_snack.model.entity.User;
import com.joel.gestion_snack.repository.RoleRepository;
import com.joel.gestion_snack.repository.UserRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
    private final MapperUtil mapperUtil;
    private final EntityManager entityManager;
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
    public UserDTO updateUser(Long id, UserRequestDTO requestDTO) {
        log.info("Mise à jour de l'utilisateur avec l'ID: {}", id);
        User user = userRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Utilisateur non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Utilisateur non trouvé avec l'ID: " + id);
                });

        // Vérifier si le username change et s'il existe déjà
        if (!user.getUsername().equals(requestDTO.getUsername())) {
            if (userRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
                log.error("Un utilisateur avec le username {} existe déjà", requestDTO.getUsername());
                throw new IllegalArgumentException("Un utilisateur avec ce nom d'utilisateur existe déjà");
            }
        }

        // Vérifier si l'email change et s'il existe déjà
        if (!user.getEmail().equals(requestDTO.getEmail())) {
            if (userRepository.findByEmail(requestDTO.getEmail()).isPresent()) {
                log.error("Un utilisateur avec l'email {} existe déjà", requestDTO.getEmail());
                throw new IllegalArgumentException("Un utilisateur avec cet email existe déjà");
            }
        }

        // Récupérer le rôle
        Role role = roleRepository.findById(requestDTO.getRoleId())
                .orElseThrow(() -> new EntityNotFoundException("Rôle non trouvé"));

        user.setOwnerId(requestDTO.getOwnerId());
        user.setUsername(requestDTO.getUsername());
        // Mettre à jour le mot de passe seulement s'il est fourni
        if (requestDTO.getPassword() != null && !requestDTO.getPassword().isEmpty()) {
            user.setPassword(passwordEncoder.encode(requestDTO.getPassword()));
        }
        user.setEmail(requestDTO.getEmail());
        user.setRole(role);
        user.setPinUpToDate(requestDTO.getPinUpToDate() != null ? requestDTO.getPinUpToDate() : user.getPinUpToDate());
        user.setUpdatedBy(requestDTO.getCreatedBy());

        user = userRepository.save(user);
        log.info("Utilisateur mis à jour avec succès avec l'ID: {}", user.getUserId());
        return mapperUtil.toUserDTO(user);
    }

    @Override
    public void deleteUser(Long id) {
        log.info("Suppression de l'utilisateur avec l'ID: {}", id);
        if (!userRepository.existsById(id)) {
            log.error("Utilisateur non trouvé avec l'ID: {}", id);
            throw new EntityNotFoundException("Utilisateur non trouvé avec l'ID: " + id);
        }
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
}
