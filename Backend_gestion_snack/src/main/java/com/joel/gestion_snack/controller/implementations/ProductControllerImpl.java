package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.controller.interfaces.IProductController;
import com.joel.gestion_snack.model.dto.ProductDTO;
import com.joel.gestion_snack.model.dto.ProductRequestDTO;
import com.joel.gestion_snack.model.entity.ProductType;
import com.joel.gestion_snack.service.interfaces.IProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Implémentation du contrôleur pour la gestion des produits
 */
@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Produits", description = "API pour la gestion des produits")
public class ProductControllerImpl implements IProductController {
    
    private final IProductService productService;

    @Value("${app.base.url:http://localhost:8080}")
    private String appBaseUrl;
    
    @Override
    @GetMapping
    @Operation(summary = "Récupérer tous les produits")
    public ResponseEntity<List<ProductDTO>> getAllProducts() {
        log.info("Requête GET pour récupérer tous les produits");
        List<ProductDTO> products = productService.getAllProducts();
        return ResponseEntity.ok(products);
    }
    
    @Override
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un produit par son ID")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer le produit avec l'ID: {}", id);
        ProductDTO product = productService.getProductById(id);
        return ResponseEntity.ok(product);
    }
    
    @Override
    @PostMapping
    @Operation(summary = "Créer un nouveau produit")
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductRequestDTO requestDTO) {
        log.info("Requête POST pour créer un nouveau produit: {}", requestDTO.getProductName());
        ProductDTO product = productService.createProduct(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(product);
    }
    
    @Override
    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un produit")
    public ResponseEntity<ProductDTO> updateProduct(@PathVariable Long id, 
                                                      @Valid @RequestBody ProductRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour le produit avec l'ID: {}", id);
        ProductDTO product = productService.updateProduct(id, requestDTO);
        return ResponseEntity.ok(product);
    }
    
    @Override
    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer un produit")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer le produit avec l'ID: {}", id);
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
    
    @Override
    @GetMapping("/type/{productType}")
    @Operation(summary = "Récupérer les produits par type")
    public ResponseEntity<List<ProductDTO>> getProductsByType(@PathVariable ProductType productType) {
        log.info("Requête GET pour récupérer les produits de type: {}", productType);
        List<ProductDTO> products = productService.getProductsByType(productType);
        return ResponseEntity.ok(products);
    }
    
    @Override
    @GetMapping("/low-stock")
    @Operation(summary = "Récupérer les produits avec stock faible")
    public ResponseEntity<List<ProductDTO>> getProductsWithLowStock() {
        log.info("Requête GET pour récupérer les produits avec stock faible");
        List<ProductDTO> products = productService.getProductsWithLowStock();
        return ResponseEntity.ok(products);
    }

    @PostMapping(value = "/{id}/upload-image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Uploader l'image d'un produit")
    public ResponseEntity<ProductDTO> uploadProductImage(@PathVariable Long id, @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        log.info("Requête POST pour uploader l'image du produit ID: {}", id);
        try {
            if (file.isEmpty()) {
                throw new IllegalArgumentException("Le fichier est vide");
            }
            
            java.io.File uploadDir = new java.io.File("uploads");
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }
            
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            } else {
                extension = ".png";
            }
            
            String newFilename = "product_" + id + "_" + System.currentTimeMillis() + extension;
            java.io.File destFile = new java.io.File(uploadDir, newFilename);
            
            java.nio.file.Files.copy(file.getInputStream(), destFile.getAbsoluteFile().toPath(), java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            
            String imageUrl = appBaseUrl + "/uploads/" + newFilename;
            
            ProductRequestDTO requestDTO = new ProductRequestDTO();
            ProductDTO existing = productService.getProductById(id);
            requestDTO.setProductName(existing.getProductName());
            requestDTO.setUnitPrice(existing.getUnitPrice());
            requestDTO.setQuantityAvailable(existing.getQuantityAvailable());
            requestDTO.setAlertThreshold(existing.getAlertThreshold());
            requestDTO.setCategoryId(existing.getCategoryId());
            requestDTO.setStockId(existing.getStockId());
            requestDTO.setDescription(existing.getDescription());
            requestDTO.setAlergy(existing.getAlergy());
            requestDTO.setImageUrl(imageUrl);
            requestDTO.setProductType(existing.getProductType());
            requestDTO.setCreatedBy(existing.getCreatedBy());
            
            ProductDTO updated = productService.updateProduct(id, requestDTO);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Erreur lors de l'upload de l'image", e);
            throw new RuntimeException("Erreur lors de l'upload de l'image: " + e.getMessage());
        }
    }
}

