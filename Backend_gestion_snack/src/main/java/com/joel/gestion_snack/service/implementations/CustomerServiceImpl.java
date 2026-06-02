package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.CustomerDTO;
import com.joel.gestion_snack.model.dto.CustomerRequestDTO;
import com.joel.gestion_snack.model.entity.Customer;
import com.joel.gestion_snack.repository.CustomerRepository;
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
        log.info("Création d'un nouveau client: {}", requestDTO.getEmail());
        
        // Vérifier si l'email existe déjà
        if (customerRepository.findByEmail(requestDTO.getEmail()).isPresent()) {
            log.error("Un client avec l'email {} existe déjà", requestDTO.getEmail());
            throw new IllegalArgumentException("Un client avec cet email existe déjà");
        }
        
        // Vérifier si le username existe déjà
        if (customerRepository.findByUsername(requestDTO.getUsername()).isPresent()) {
            log.error("Un client avec le username {} existe déjà", requestDTO.getUsername());
            throw new IllegalArgumentException("Un client avec ce nom d'utilisateur existe déjà");
        }
        
        Customer customer = mapperUtil.toCustomer(requestDTO);
        boolean emailEnabled = mailUsername != null && !mailUsername.isBlank();

        String token = null;
        if (emailEnabled) {
            // Email configuré → vérification requise
            token = UUID.randomUUID().toString();
            customer.setEmailVerified(false);
            customer.setVerificationToken(token);
            customer.setVerificationTokenExpiry(LocalDateTime.now().plusHours(24));
        } else {
            // Email non configuré → activation immédiate
            customer.setEmailVerified(true);
        }

        customer = customerRepository.save(customer);

        // Le trigger crée le User (is_active=true). On force le flush pour pouvoir l'interroger.
        entityManager.flush();

        // Mettre à jour le mot de passe du User si fourni
        if (requestDTO.getPassword() != null && !requestDTO.getPassword().isBlank()) {
            final String encodedPwd = passwordEncoder.encode(requestDTO.getPassword());
            userRepository.findByEmail(requestDTO.getEmail()).ifPresent(user -> {
                user.setPassword(encodedPwd);
                userRepository.save(user);
            });
        }

        if (emailEnabled) {
            // Désactiver le compte jusqu'à vérification email
            userRepository.findByEmail(customer.getEmail()).ifPresent(user -> {
                user.setIsActive(false);
                userRepository.save(user);
            });
            // Envoyer l'email de vérification
            emailService.sendVerificationEmail(customer.getEmail(), token, customer.getFirstName());
            log.info("Email de vérification envoyé pour le client ID: {}", customer.getCustomerId());
        } else {
            log.info("Email non configuré — client activé directement, ID: {}", customer.getCustomerId());
        }

        log.info("Client créé avec succès avec l'ID: {}", customer.getCustomerId());
        return mapperUtil.toCustomerDTO(customer);
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
        log.info("Suppression du client avec l'ID: {}", id);
        if (!customerRepository.existsById(id)) {
            log.error("Client non trouvé avec l'ID: {}", id);
            throw new EntityNotFoundException("Client non trouvé avec l'ID: " + id);
        }
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

