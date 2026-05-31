package com.joel.gestion_snack.controller.interfaces;

import com.joel.gestion_snack.model.dto.ProductDTO;
import com.joel.gestion_snack.model.dto.ProductRequestDTO;
import com.joel.gestion_snack.model.entity.ProductType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;

import java.util.List;

/**
 * Interface du contrôleur pour la gestion des produits
 */
@Tag(name = "Produits", description = "API pour la gestion des produits")
public interface IProductController {
    
    @Operation(summary = "Récupérer tous les produits")
    ResponseEntity<List<ProductDTO>> getAllProducts();
    
    @Operation(summary = "Récupérer un produit par son ID")
    ResponseEntity<ProductDTO> getProductById(Long id);
    
    @Operation(summary = "Créer un nouveau produit")
    ResponseEntity<ProductDTO> createProduct(@Valid ProductRequestDTO requestDTO);
    
    @Operation(summary = "Mettre à jour un produit")
    ResponseEntity<ProductDTO> updateProduct(Long id, @Valid ProductRequestDTO requestDTO);
    
    @Operation(summary = "Supprimer un produit")
    ResponseEntity<Void> deleteProduct(Long id);
    
    @Operation(summary = "Récupérer les produits par type")
    ResponseEntity<List<ProductDTO>> getProductsByType(ProductType productType);
    
    @Operation(summary = "Récupérer les produits avec stock faible")
    ResponseEntity<List<ProductDTO>> getProductsWithLowStock();
}

