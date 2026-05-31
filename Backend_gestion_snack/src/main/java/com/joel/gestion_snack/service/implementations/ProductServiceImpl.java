package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.ProductDTO;
import com.joel.gestion_snack.model.dto.ProductRequestDTO;
import com.joel.gestion_snack.model.entity.Product;
import com.joel.gestion_snack.model.entity.ProductType;
import com.joel.gestion_snack.repository.ProductRepository;
import com.joel.gestion_snack.service.interfaces.IProductService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des produits
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProductServiceImpl implements IProductService {
    
    private final ProductRepository productRepository;
    private final com.joel.gestion_snack.repository.ReviewRepository reviewRepository;
    private final MapperUtil mapperUtil;
    
    private ProductDTO enrichProductDTO(Product product) {
        ProductDTO dto = mapperUtil.toProductDTO(product);
        List<com.joel.gestion_snack.model.entity.Review> reviews = reviewRepository.findByProduct_ProductId(product.getProductId());
        if (reviews == null || reviews.isEmpty()) {
            dto.setAverageRating(0.0);
            dto.setReviewCount(0);
        } else {
            double sum = reviews.stream()
                    .filter(r -> r.getStar() != null)
                    .mapToInt(com.joel.gestion_snack.model.entity.Review::getStar)
                    .sum();
            long count = reviews.stream()
                    .filter(r -> r.getStar() != null)
                    .count();
            dto.setAverageRating(count > 0 ? sum / count : 0.0);
            dto.setReviewCount((int) count);
        }
        return dto;
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getAllProducts() {
        log.info("Récupération de tous les produits");
        List<Product> products = productRepository.findAll();
        log.debug("Nombre de produits trouvés: {}", products.size());
        return products.stream()
                .map(this::enrichProductDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public ProductDTO getProductById(Long id) {
        log.info("Récupération du produit avec l'ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Produit non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Produit non trouvé avec l'ID: " + id);
                });
        return enrichProductDTO(product);
    }
    
    @Override
    public ProductDTO createProduct(ProductRequestDTO requestDTO) {
        log.info("Création d'un nouveau produit: {}", requestDTO.getProductName());
        
        // Vérifier si le nom du produit existe déjà
        if (productRepository.findByProductName(requestDTO.getProductName()).isPresent()) {
            log.error("Un produit avec le nom {} existe déjà", requestDTO.getProductName());
            throw new IllegalArgumentException("Un produit avec ce nom existe déjà");
        }
        
        Product product = mapperUtil.toProduct(requestDTO);
        product = productRepository.save(product);
        log.info("Produit créé avec succès avec l'ID: {}", product.getProductId());
        return enrichProductDTO(product);
    }
    
    @Override
    public ProductDTO updateProduct(Long id, ProductRequestDTO requestDTO) {
        log.info("Mise à jour du produit avec l'ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Produit non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Produit non trouvé avec l'ID: " + id);
                });
        
        // Vérifier si le nom change et s'il existe déjà
        if (!product.getProductName().equals(requestDTO.getProductName())) {
            if (productRepository.findByProductName(requestDTO.getProductName()).isPresent()) {
                log.error("Un produit avec le nom {} existe déjà", requestDTO.getProductName());
                throw new IllegalArgumentException("Un produit avec ce nom existe déjà");
            }
        }
        
        product.setProductName(requestDTO.getProductName());
        product.setUnitPrice(requestDTO.getUnitPrice());
        product.setQuantityAvailable(requestDTO.getQuantityAvailable());
        product.setAlertThreshold(requestDTO.getAlertThreshold());
        product.setProductType(requestDTO.getProductType());
        product.setDescription(requestDTO.getDescription());
        product.setAlergy(requestDTO.getAlergy());
        product.setImageUrl(requestDTO.getImageUrl());
        product.setNeedsSauce(requestDTO.getNeedsSauce() != null ? requestDTO.getNeedsSauce() : false);
        product.setNeedsViande(requestDTO.getNeedsViande() != null ? requestDTO.getNeedsViande() : false);
        product.setUpdatedBy(requestDTO.getCreatedBy());
        
        product = productRepository.save(product);
        log.info("Produit mis à jour avec succès avec l'ID: {}", product.getProductId());
        return enrichProductDTO(product);
    }
    
    @Override
    public void deleteProduct(Long id) {
        log.info("Suppression du produit avec l'ID: {}", id);
        if (!productRepository.existsById(id)) {
            log.error("Produit non trouvé avec l'ID: {}", id);
            throw new EntityNotFoundException("Produit non trouvé avec l'ID: " + id);
        }
        productRepository.deleteById(id);
        log.info("Produit supprimé avec succès avec l'ID: {}", id);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsByType(ProductType productType) {
        log.info("Récupération des produits de type: {}", productType);
        List<Product> products = productRepository.findByProductType(productType);
        log.debug("Nombre de produits trouvés: {}", products.size());
        return products.stream()
                .map(this::enrichProductDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ProductDTO> getProductsWithLowStock() {
        log.info("Récupération des produits avec stock faible");
        List<Product> products = productRepository.findAll().stream()
                .filter(p -> p.getQuantityAvailable() <= p.getAlertThreshold())
                .collect(Collectors.toList());
        log.debug("Nombre de produits avec stock faible: {}", products.size());
        return products.stream()
                .map(this::enrichProductDTO)
                .collect(Collectors.toList());
    }
}

