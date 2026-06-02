package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.controller.interfaces.IProductController;
import com.joel.gestion_snack.model.dto.ProductDTO;
import com.joel.gestion_snack.model.dto.ProductRequestDTO;
import com.joel.gestion_snack.model.entity.ProductType;
import com.joel.gestion_snack.service.CloudinaryService;
import com.joel.gestion_snack.service.interfaces.IProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Produits", description = "API pour la gestion des produits")
public class ProductControllerImpl implements IProductController {

    private final IProductService productService;
    private final CloudinaryService cloudinaryService;

    @Override
    @GetMapping
    @Operation(summary = "Récupérer tous les produits")
    public ResponseEntity<List<ProductDTO>> getAllProducts() {
        log.info("Requête GET pour récupérer tous les produits");
        return ResponseEntity.ok(productService.getAllProducts());
    }

    @Override
    @GetMapping("/{id}")
    @Operation(summary = "Récupérer un produit par son ID")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer le produit avec l'ID: {}", id);
        return ResponseEntity.ok(productService.getProductById(id));
    }

    @Override
    @PostMapping
    @Operation(summary = "Créer un nouveau produit")
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductRequestDTO requestDTO) {
        log.info("Requête POST pour créer un nouveau produit: {}", requestDTO.getProductName());
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(requestDTO));
    }

    @Override
    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour un produit")
    public ResponseEntity<ProductDTO> updateProduct(@PathVariable Long id,
                                                    @Valid @RequestBody ProductRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour le produit avec l'ID: {}", id);
        return ResponseEntity.ok(productService.updateProduct(id, requestDTO));
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
        return ResponseEntity.ok(productService.getProductsByType(productType));
    }

    @Override
    @GetMapping("/low-stock")
    @Operation(summary = "Récupérer les produits avec stock faible")
    public ResponseEntity<List<ProductDTO>> getProductsWithLowStock() {
        log.info("Requête GET pour récupérer les produits avec stock faible");
        return ResponseEntity.ok(productService.getProductsWithLowStock());
    }

    @PostMapping(value = "/{id}/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Uploader l'image d'un produit vers Cloudinary")
    public ResponseEntity<ProductDTO> uploadProductImage(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {

        log.info("Upload image Cloudinary pour le produit ID: {}", id);

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Le fichier est vide");
        }

        try {
            String imageUrl = cloudinaryService.uploadImage(file, "product_" + id);

            ProductDTO existing = productService.getProductById(id);
            ProductRequestDTO requestDTO = new ProductRequestDTO();
            requestDTO.setProductName(existing.getProductName());
            requestDTO.setUnitPrice(existing.getUnitPrice());
            requestDTO.setQuantityAvailable(existing.getQuantityAvailable());
            requestDTO.setAlertThreshold(existing.getAlertThreshold());
            requestDTO.setCategoryId(existing.getCategoryId());
            requestDTO.setStockId(existing.getStockId());
            requestDTO.setDescription(existing.getDescription());
            requestDTO.setAlergy(existing.getAlergy());
            requestDTO.setProductType(existing.getProductType());
            requestDTO.setCreatedBy(existing.getCreatedBy());
            requestDTO.setImageUrl(imageUrl);

            return ResponseEntity.ok(productService.updateProduct(id, requestDTO));

        } catch (Exception e) {
            log.error("Erreur upload image Cloudinary pour produit {}", id, e);
            throw new RuntimeException("Erreur lors de l'upload de l'image : " + e.getMessage());
        }
    }
}
