package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.*;
import com.joel.gestion_snack.model.entity.*;
import com.joel.gestion_snack.repository.*;
import com.joel.gestion_snack.service.interfaces.IProviderService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des fournisseurs
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ProviderServiceImpl implements IProviderService {

    private final ProviderRepository providerRepository;
    private final ProviderProductRepository providerProductRepository;
    private final ProductRepository productRepository;
    private final MapperUtil mapperUtil;

    @Override
    @Transactional(readOnly = true)
    public List<ProviderDTO> getAllProviders() {
        log.info("Récupération de tous les fournisseurs");
        return providerRepository.findAll().stream()
                .map(mapperUtil::toProviderDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProviderDTO getProviderById(@lombok.NonNull Long id) {
        log.info("Récupération du fournisseur avec l'ID: {}", id);
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Fournisseur non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Fournisseur non trouvé avec l'ID: " + id);
                });
        return mapperUtil.toProviderDTO(provider);
    }

    @Override
    public ProviderDTO createProvider(ProviderRequestDTO requestDTO) {
        log.info("Création d'un nouveau fournisseur: {}", requestDTO.getEmail());
        if (providerRepository.findByEmail(requestDTO.getEmail()).isPresent()) {
            log.error("Un fournisseur avec l'email {} existe déjà", requestDTO.getEmail());
            throw new IllegalArgumentException("Un fournisseur avec cet email existe déjà");
        }
        Provider provider = mapperUtil.toProvider(requestDTO);
        provider = providerRepository.save(provider);
        log.info("Fournisseur créé avec succès avec l'ID: {}", provider.getProviderId());
        return mapperUtil.toProviderDTO(provider);
    }

    @Override
    public ProviderDTO updateProvider(@lombok.NonNull Long id, ProviderRequestDTO requestDTO) {
        log.info("Mise à jour du fournisseur avec l'ID: {}", id);
        Provider provider = providerRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Fournisseur non trouvé avec l'ID: {}", id);
                    return new EntityNotFoundException("Fournisseur non trouvé");
                });
        provider.setName(requestDTO.getName());
        provider.setAddress(requestDTO.getAddress());
        provider.setPhone(requestDTO.getPhone());
        provider.setEmail(requestDTO.getEmail());
        provider.setProviderType(requestDTO.getProviderType());
        provider.setDeliveryDelay(requestDTO.getDeliveryDelay());
        provider.setUpdatedBy(requestDTO.getCreatedBy());
        provider = providerRepository.save(provider);
        log.info("Fournisseur mis à jour avec succès");
        return mapperUtil.toProviderDTO(provider);
    }

    @Override
    public void deleteProvider(@lombok.NonNull Long id) {
        log.info("Suppression du fournisseur avec l'ID: {}", id);
        if (!providerRepository.existsById(id)) {
            log.error("Fournisseur non trouvé avec l'ID: {}", id);
            throw new EntityNotFoundException("Fournisseur non trouvé");
        }
        providerRepository.deleteById(id);
        log.info("Fournisseur supprimé avec succès");
    }

    @Override
    public ProviderProductDTO recordSupply(ProviderProductRequestDTO requestDTO) {
        log.info("Enregistrement d'une fourniture: produit={}, quantité={}",
                requestDTO.getProductId(), requestDTO.getQuantity());
        Provider provider = providerRepository.findById(requestDTO.getProviderId())
                .orElseThrow(() -> {
                    log.error("Fournisseur non trouvé avec l'ID: {}", requestDTO.getProviderId());
                    return new EntityNotFoundException("Fournisseur non trouvé");
                });
        Product product = productRepository.findById(requestDTO.getProductId())
                .orElseThrow(() -> {
                    log.error("Produit non trouvé avec l'ID: {}", requestDTO.getProductId());
                    return new EntityNotFoundException("Produit non trouvé");
                });

        ProviderProduct providerProduct = mapperUtil.toProviderProduct(requestDTO);
        providerProduct.setProvider(provider);
        providerProduct.setProduct(product);
        providerProduct
                .setSupplyDate(requestDTO.getSupplyDate() != null ? requestDTO.getSupplyDate() : LocalDate.now());
        providerProduct = providerProductRepository.save(providerProduct);

        log.info("Fourniture enregistrée avec l'ID: {}", providerProduct.getProvideId());
        return mapperUtil.toProviderProductDTO(providerProduct);
    }

    @Override
    public ProviderProductDTO validateSupply(Long supplyId) {
        log.info("Validation de la fourniture avec l'ID: {}", supplyId);
        ProviderProduct providerProduct = providerProductRepository.findById(supplyId)
                .orElseThrow(() -> {
                    log.error("Fourniture non trouvée avec l'ID: {}", supplyId);
                    return new EntityNotFoundException("Fourniture non trouvée");
                });

        // Mise à jour du stock
        Product product = providerProduct.getProduct();
        product.setQuantityAvailable(product.getQuantityAvailable() + providerProduct.getQuantity());
        productRepository.save(product);

        log.info("Fourniture validée et stock mis à jour pour le produit: {}", product.getProductName());
        return mapperUtil.toProviderProductDTO(providerProduct);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProviderProductDTO> getAllSupplies() {
        log.info("Récupération de toutes les fournitures");
        return providerProductRepository.findAll().stream()
                .map(mapperUtil::toProviderProductDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProviderProductDTO> getSuppliesByProvider(Long providerId) {
        log.info("Récupération des fournitures du fournisseur avec l'ID: {}", providerId);
        return providerProductRepository.findByProvider_ProviderId(providerId).stream()
                .map(mapperUtil::toProviderProductDTO)
                .collect(Collectors.toList());
    }
}
