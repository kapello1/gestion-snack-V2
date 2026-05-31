package com.joel.gestion_snack.service.interfaces;

import com.joel.gestion_snack.model.dto.ProductDTO;
import com.joel.gestion_snack.model.dto.ProductRequestDTO;
import com.joel.gestion_snack.model.entity.ProductType;

import java.util.List;

/**
 * Interface du service pour la gestion des produits
 */
public interface IProductService {
    /**
     * Récupère tous les produits
     * @return Liste de tous les produits
     */
    List<ProductDTO> getAllProducts();
    
    /**
     * Récupère un produit par son ID
     * @param id ID du produit
     * @return DTO du produit
     */
    ProductDTO getProductById(Long id);
    
    /**
     * Crée un nouveau produit
     * @param requestDTO DTO de requête pour créer un produit
     * @return DTO du produit créé
     */
    ProductDTO createProduct(ProductRequestDTO requestDTO);
    
    /**
     * Met à jour un produit existant
     * @param id ID du produit à mettre à jour
     * @param requestDTO DTO de requête pour mettre à jour un produit
     * @return DTO du produit mis à jour
     */
    ProductDTO updateProduct(Long id, ProductRequestDTO requestDTO);
    
    /**
     * Supprime un produit par son ID
     * @param id ID du produit à supprimer
     */
    void deleteProduct(Long id);
    
    /**
     * Récupère les produits par type
     * @param productType Type de produit
     * @return Liste des produits du type spécifié
     */
    List<ProductDTO> getProductsByType(ProductType productType);
    
    /**
     * Récupère les produits avec stock faible
     * @return Liste des produits avec stock faible
     */
    List<ProductDTO> getProductsWithLowStock();
}

