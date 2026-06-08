package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.CustomerDTO;
import com.joel.gestion_snack.model.dto.CustomerRequestDTO;
import com.joel.gestion_snack.model.entity.Customer;
import com.joel.gestion_snack.model.entity.Role;
import com.joel.gestion_snack.model.entity.RoleType;
import com.joel.gestion_snack.model.entity.User;
import com.joel.gestion_snack.repository.CustomerRepository;
import com.joel.gestion_snack.repository.OrderRepository;
import com.joel.gestion_snack.repository.ReservationRepository;
import com.joel.gestion_snack.repository.ReviewRepository;
import com.joel.gestion_snack.repository.RoleRepository;
import com.joel.gestion_snack.repository.UserRepository;
import com.joel.gestion_snack.service.EmailService;
import com.joel.gestion_snack.service.interfaces.ICustomerService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des clients
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class CustomerServiceImpl implements ICustomerService {
    
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final OrderRepository orderRepository;
    private final ReservationRepository reservationRepository;
    private final ReviewRepository reviewRepository;
    private final RoleRepository roleRepository;
    private final EmailService emailService;
    private final EntityManager entityManager;
    private final MapperUtil mapperUtil;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @org.springframework.beans.factory.annotation.Value("${spring.mail.username:}")
    private String mailUsername;
    
    @Override
    @Transactional(readOnly = true)
    public List<CustomerDTO> getAllCustomers() {
        log.info("Récupération de tous les clients");
        List<Customer> customers = customerRepository.findAll();
        log.debug("Nombre de clients trouvés: {}", customers.size());
        return customers.stream()
                .map(mapperUtil::toCustomerDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public CustomerDTO getCustomerById(Long id) {
        log.info("Récupération du client avec l'ID: {}", id);
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Client non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Client non trouvé avec l'ID: " + id);
                });
        return mapperUtil.toCustomerDTO(customer);
    }
    
    @Override
    public CustomerDTO createCustomer(CustomerRequestDTO requestDTO) {
        log.info("[INSCRIPTION] Début — email={} username={}", requestDTO.getEmail(), requestDTO.getUsername());

        // 1. Nettoyage client orphelin OU refus si compte actif existe
        customerRepository.findByEmail(requestDTO.getEmail()).ifPresent(existingCustomer -> {
            boolean hasUser = userRepository.findByEmail(requestDTO.getEmail()).isPresent();
            if (hasUser) {
                throw new IllegalArgumentException("Un client avec cet email existe déjà");
            }
            log.warn("[INSCRIPTION] Client orphelin détecté pour {} — nettoyage", requestDTO.getEmail());
            Long cid = existingCustomer.getCustomerId();
            orderRepository.findByCustomer_CustomerId(cid).forEach(o -> {
                o.setCustomer(null);
                orderRepository.save(o);
            });
            reservationRepository.findByCustomer_CustomerId(cid).forEach(reservationRepository::delete);
            reviewRepository.findByCustomer_CustomerId(cid).forEach(reviewRepository::delete);
            customerRepository.delete(existingCustomer);
            customerRepository.flush();
            log.info("[INSCRIPTION] Client orphelin {} supprimé", cid);
        });

        // 2. Vérification unicité username
        if (customerRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Un client avec ce nom d'utilisateur existe déjà");
        }
        if (userRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Ce nom d'utilisateur est déjà utilisé");
        }

        // 3. Préparer le Customer
        boolean emailEnabled = mailUsername != null && !mailUsername.isBlank();
        log.info("[INSCRIPTION] emailEnabled={}", emailEnabled);
        String token = null;
        Customer customer = mapperUtil.toCustomer(requestDTO);
        if (emailEnabled) {
            token = UUID.randomUUID().toString();
            customer.setEmailVerified(false);
            customer.setVerificationToken(token);
            customer.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
        } else {
            customer.setEmailVerified(true);
        }

        // 4. Sauvegarder le Customer (GenerationType.IDENTITY → INSERT immédiat → trigger DB s'exécute)
        customer = customerRepository.save(customer);
        final Long customerId = customer.getCustomerId();
        log.info("[INSCRIPTION] Customer sauvegardé ID={}", customerId);

        // 5. Vider le cache L1 Hibernate pour voir les entités créées par le trigger
        entityManager.flush();
        entityManager.clear();

        // Re-charger le customer (détaché par clear)
        customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new EntityNotFoundException("Customer introuvable après save ID=" + customerId));

        // 6. Trouver le User créé par le trigger, ou le créer si absent
        User customerUser = findOrCreateUserForCustomer(requestDTO, customerId);

        // 7. Toujours encoder le mot de passe en BCrypt (le trigger peut avoir mis 'PENDING_BCRYPT')
        if (customerUser != null && requestDTO.getPassword() != null && !requestDTO.getPassword().isBlank()) {
            customerUser.setPassword(passwordEncoder.encode(requestDTO.getPassword()));
            customerUser = userRepository.save(customerUser);
            log.info("[INSCRIPTION] Mot de passe BCrypt défini userId={}", customerUser.getUserId());
        }

        // 8. Gestion email de vérification
        if (emailEnabled) {
            final String finalToken = token;
            boolean emailSent = emailService.sendVerificationEmail(
                    customer.getEmail(), finalToken, customer.getFirstName());
            if (emailSent) {
                if (customerUser != null) {
                    customerUser.setIsActive(false);
                    userRepository.save(customerUser);
                }
                log.info("[INSCRIPTION] Email envoyé — compte désactivé en attente de vérification ID={}", customerId);
            } else {
                customer.setEmailVerified(true);
                customer.setVerificationToken(null);
                customer.setVerificationTokenExpiry(null);
                customer = customerRepository.save(customer);
                if (customerUser != null) {
                    customerUser.setIsActive(true);
                    userRepository.save(customerUser);
                }
                log.warn("[INSCRIPTION] Email non envoyé — client activé directement ID={}", customerId);
            }
        } else {
            log.info("[INSCRIPTION] Email non configuré — client activé directement ID={}", customerId);
        }

        log.info("[INSCRIPTION] Succès — customerId={}", customer.getCustomerId());
        return mapperUtil.toCustomerDTO(customer);
    }

    private User findOrCreateUserForCustomer(CustomerRequestDTO requestDTO, Long customerId) {
        return userRepository.findByEmail(requestDTO.getEmail()).orElseGet(() -> {
            log.warn("[INSCRIPTION] Trigger n'a pas créé de User pour {} — création manuelle", requestDTO.getEmail());
            Role customerRole = roleRepository.findAll().stream()
                    .filter(r -> r.getRoleName() == RoleType.CUSTOMER).findFirst().orElse(null);
            if (customerRole == null) {
                log.error("[INSCRIPTION] Rôle CUSTOMER introuvable — User non créé !");
                return null;
            }
            User newUser = new User();
            newUser.setOwnerId(customerId);
            newUser.setUsername(requestDTO.getUsername());
            newUser.setPassword(passwordEncoder.encode(
                    requestDTO.getPassword() != null && !requestDTO.getPassword().isBlank()
                            ? requestDTO.getPassword() : "1234"));
            newUser.setEmail(requestDTO.getEmail());
            newUser.setRole(customerRole);
            newUser.setIsActive(true);
            newUser.setCreatedBy("SYSTEM");
            User saved = userRepository.save(newUser);
            log.info("[INSCRIPTION] User créé manuellement userId={}", saved.getUserId());
            return saved;
        });
    }
    
    @Override
    public CustomerDTO updateCustomer(Long id, CustomerRequestDTO requestDTO) {
        log.info("Mise à jour du client avec l'ID: {}", id);
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Client non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Client non trouvé avec l'ID: " + id);
                });
        
        // Vérifier si l'email change et s'il existe déjà
        if (!customer.getEmail().equals(requestDTO.getEmail())) {
            if (customerRepository.findByEmail(requestDTO.getEmail()).isPresent()) {
                log.error("Un client avec l'email {} existe déjà", requestDTO.getEmail());
                throw new IllegalArgumentException("Un client avec cet email existe déjà");
            }
        }
        
        // Vérifier si le username change et s'il existe déjà
        if (!customer.getUsername().equals(requestDTO.getUsername())) {
            if (customerRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
                log.error("Un client avec le username {} existe déjà", requestDTO.getUsername());
                throw new IllegalArgumentException("Un client avec ce nom d'utilisateur existe déjà");
            }
        }
        
        customer.setFirstName(requestDTO.getFirstName());
        customer.setLastName(requestDTO.getLastName());
        customer.setUsername(requestDTO.getUsername());
        customer.setAddress(requestDTO.getAddress());
        customer.setPhone(requestDTO.getPhone());
        customer.setEmail(requestDTO.getEmail());
        customer.setUpdatedBy(requestDTO.getCreatedBy());
        
        customer = customerRepository.save(customer);
        log.info("Client mis à jour avec succès avec l'ID: {}", customer.getCustomerId());
        return mapperUtil.toCustomerDTO(customer);
    }
    
    @Override
    public void deleteCustomer(Long id) {
        log.info("Suppression en cascade du client avec l'ID: {}", id);
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé avec l'ID: " + id));

        // 1. Détacher les commandes (ne pas supprimer l'historique)
        orderRepository.findByCustomer_CustomerId(id).forEach(order -> {
            order.setCustomer(null);
            orderRepository.save(order);
        });

        // 2. Supprimer les réservations
        reservationRepository.findByCustomer_CustomerId(id).forEach(reservationRepository::delete);

        // 3. Supprimer les avis
        reviewRepository.findByCustomer_CustomerId(id).forEach(reviewRepository::delete);

        // 4. Supprimer le compte User associé
        userRepository.findByEmail(customer.getEmail()).ifPresent(user -> {
            userRepository.delete(user);
            log.info("Compte User supprimé pour le client ID: {}", id);
        });

        // 5. Supprimer le client
        customerRepository.deleteById(id);
        log.info("Client supprimé avec succès avec l'ID: {}", id);
    }
    
    @Override
    @Transactional(readOnly = true)
    public CustomerDTO getCustomerByEmail(String email) {
        log.info("Récupération du client avec l'email: {}", email);
        Customer customer = customerRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.error("Client non trouvé avec l'email: {}", email);
                    return new EntityNotFoundException("Client non trouvé avec l'email: " + email);
                });
        return mapperUtil.toCustomerDTO(customer);
    }
    
    @Override
    @Transactional(readOnly = true)
    public CustomerDTO getCustomerByUsername(String username) {
        log.info("Récupération du client avec le username: {}", username);
        Customer customer = customerRepository.findByUsername(username)
                .orElseThrow(() -> {
                    log.error("Client non trouvé avec le username: {}", username);
                    return new EntityNotFoundException("Client non trouvé avec le username: " + username);
                });
        return mapperUtil.toCustomerDTO(customer);
    }

    @Override
    public CustomerDTO verifyEmail(String token) {
        log.info("Vérification de l'email via token");
        Customer customer = customerRepository.findByVerificationToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Token de vérification invalide ou déjà utilisé"));

        if (customer.getVerificationTokenExpiry() == null ||
                customer.getVerificationTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Le lien de vérification a expiré. Veuillez vous réinscrire.");
        }

        customer.setEmailVerified(true);
        customer.setVerificationToken(null);
        customer.setVerificationTokenExpiry(null);
        Customer saved = customerRepository.save(customer);

        // Activer le compte User correspondant
        userRepository.findByEmail(saved.getEmail()).ifPresent(user -> {
            user.setIsActive(true);
            userRepository.save(user);
            log.info("Compte User activé pour le client: {}", saved.getEmail());
        });

        log.info("Email vérifié avec succès pour le client ID: {}", saved.getCustomerId());
        return mapperUtil.toCustomerDTO(saved);
    }
}

