package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.CustomerDTO;
import com.joel.gestion_snack.model.dto.CustomerRequestDTO;
import com.joel.gestion_snack.model.entity.Customer;
import com.joel.gestion_snack.repository.CustomerRepository;
import com.joel.gestion_snack.service.interfaces.ICustomerService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
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
    private final MapperUtil mapperUtil;
    
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
        customer = customerRepository.save(customer);
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
}

