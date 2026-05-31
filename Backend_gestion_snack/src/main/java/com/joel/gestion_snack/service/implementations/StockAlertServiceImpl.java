package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.StockAlertDTO;
import com.joel.gestion_snack.model.entity.StockAlert;
import com.joel.gestion_snack.repository.StockAlertRepository;
import com.joel.gestion_snack.service.interfaces.IStockAlertService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des alertes de stock
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class StockAlertServiceImpl implements IStockAlertService {
    
    private final StockAlertRepository stockAlertRepository;
    private final MapperUtil mapperUtil;
    
    @Override
    @Transactional(readOnly = true)
    public List<StockAlertDTO> getAllAlerts() {
        log.info("Récupération de toutes les alertes de stock");
        return stockAlertRepository.findAll().stream()
                .map(mapperUtil::toStockAlertDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public StockAlertDTO getAlertById(Long id) {
        log.info("Récupération de l'alerte avec l'ID: {}", id);
        StockAlert alert = stockAlertRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Alerte non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Alerte non trouvée avec l'ID: " + id);
                });
        return mapperUtil.toStockAlertDTO(alert);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<StockAlertDTO> getUnresolvedAlerts() {
        log.info("Récupération des alertes non résolues");
        return stockAlertRepository.findByResolved(false).stream()
                .map(mapperUtil::toStockAlertDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    public StockAlertDTO resolveAlert(Long id) {
        log.info("Résolution de l'alerte avec l'ID: {}", id);
        StockAlert alert = stockAlertRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Alerte non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Alerte non trouvée");
                });
        alert.setResolved(true);
        alert = stockAlertRepository.save(alert);
        log.info("Alerte résolue avec succès");
        return mapperUtil.toStockAlertDTO(alert);
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<StockAlertDTO> getAlertsByProduct(Long productId) {
        log.info("Récupération des alertes du produit avec l'ID: {}", productId);
        return stockAlertRepository.findByProduct_ProductId(productId).stream()
                .map(mapperUtil::toStockAlertDTO)
                .collect(Collectors.toList());
    }
}

