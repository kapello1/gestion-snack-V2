package com.joel.gestion_snack.controller.implementations;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Contrôleur pour la gestion du chiffre d'affaires
 */
@RestController
@RequestMapping("/api/revenue")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Chiffre d'affaires", description = "API pour la gestion du chiffre d'affaires")
public class RevenueController {

    private final com.joel.gestion_snack.repository.OrderRepository orderRepository;

    @GetMapping("/total")
    @Operation(summary = "Récupérer le chiffre d'affaires total (Somme de toutes les commandes)")
    public ResponseEntity<Map<String, Object>> getTotalRevenue() {
        log.info("Requête GET pour récupérer le chiffre d'affaires total (toutes les commandes)");

        // Calculer la somme de tous les montants de toutes les commandes
        BigDecimal totalRevenue = orderRepository.findAll()
                .stream()
                .map(order -> order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Integer totalOrders = (int) orderRepository.count();

        Map<String, Object> response = new HashMap<>();
        response.put("totalRevenue", totalRevenue);
        response.put("totalOrders", totalOrders);

        log.info("Chiffre d'affaires total calculé: {} €, Commandes: {}", totalRevenue, totalOrders);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/today")
    @Operation(summary = "Récupérer le chiffre d'affaires du jour")
    public ResponseEntity<Map<String, Object>> getTodayRevenue() {
        log.info("Requête GET pour récupérer le chiffre d'affaires du jour");

        LocalDate today = LocalDate.now();
        var ordersToday = orderRepository.findByOrderDate(today);

        BigDecimal dailyRevenue = ordersToday.stream()
                .map(order -> order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Integer dailyOrders = ordersToday.size();

        Map<String, Object> response = new HashMap<>();
        response.put("amount", dailyRevenue);
        response.put("orderCount", dailyOrders);
        response.put("date", today);

        log.info("Chiffre d'affaires du jour: {} €", response.get("amount"));
        return ResponseEntity.ok(response);
    }
}
