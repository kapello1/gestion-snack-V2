package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.ReviewDTO;
import com.joel.gestion_snack.model.dto.ReviewRequestDTO;
import com.joel.gestion_snack.model.entity.Customer;
import com.joel.gestion_snack.model.entity.Review;
import com.joel.gestion_snack.repository.CustomerRepository;
import com.joel.gestion_snack.repository.ReviewRepository;
import com.joel.gestion_snack.service.interfaces.IReviewService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des avis
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReviewServiceImpl implements IReviewService {
    
    private final ReviewRepository reviewRepository;
    private final CustomerRepository customerRepository;
    private final com.joel.gestion_snack.repository.ProductRepository productRepository;
    private final MapperUtil mapperUtil;
    
    @Override
    @Transactional(readOnly = true)
    public List<ReviewDTO> getAllReviews() {
        log.info("Récupération de tous les avis");
        return reviewRepository.findAll().stream()
                .map(mapperUtil::toReviewDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public ReviewDTO getReviewById(Long id) {
        log.info("Récupération de l'avis avec l'ID: {}", id);
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Avis non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Avis non trouvé avec l'ID: " + id);
                });
        return mapperUtil.toReviewDTO(review);
    }
    
    @Override
    public ReviewDTO createReview(ReviewRequestDTO requestDTO) {
        log.info("Création d'un nouvel avis");
        if (requestDTO.getCustomerId() == null) {
            throw new IllegalArgumentException("L'ID du client est obligatoire");
        }
        Customer customer = customerRepository.findById(requestDTO.getCustomerId())
                .orElseThrow(() -> {
                    log.error("Client non trouvé avec l'ID: {}", requestDTO.getCustomerId());
                    return new EntityNotFoundException("Client non trouvé");
                });
        com.joel.gestion_snack.model.entity.Product product = null;
        if (requestDTO.getProductId() != null) {
            product = productRepository.findById(requestDTO.getProductId())
                    .orElseThrow(() -> {
                        log.error("Produit non trouvé avec l'ID: {}", requestDTO.getProductId());
                        return new EntityNotFoundException("Produit non trouvé");
                    });
        }
        Review review = mapperUtil.toReview(requestDTO);
        review.setCustomer(customer);
        review.setProduct(product);
        review = reviewRepository.save(review);
        log.info("Avis créé avec succès avec l'ID: {}", review.getReviewId());
        return mapperUtil.toReviewDTO(review);
    }
    
    @Override
    public ReviewDTO updateReview(Long id, ReviewRequestDTO requestDTO) {
        log.info("Mise à jour de l'avis avec l'ID: {}", id);
        Review review = reviewRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Avis non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Avis non trouvé");
                });
        review.setComment(requestDTO.getComment());
        review.setStar(requestDTO.getStar());
        review.setUpdatedBy(requestDTO.getCreatedBy());
        review = reviewRepository.save(review);
        log.info("Avis mis à jour avec succès");
        return mapperUtil.toReviewDTO(review);
    }
    
    @Override
    public void deleteReview(Long id) {
        log.info("Suppression de l'avis avec l'ID: {}", id);
        if (!reviewRepository.existsById(id)) {
            log.error("Avis non trouvé avec l'ID: {}", id);
            throw new EntityNotFoundException("Avis non trouvé");
        }
        reviewRepository.deleteById(id);
        log.info("Avis supprimé avec succès");
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ReviewDTO> getReviewsByCustomer(Long customerId) {
        log.info("Récupération des avis du client avec l'ID: {}", customerId);
        return reviewRepository.findByCustomer_CustomerId(customerId).stream()
                .map(mapperUtil::toReviewDTO)
                .collect(Collectors.toList());
    }
}

