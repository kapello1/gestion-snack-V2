package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.OrderDTO;
import com.joel.gestion_snack.model.dto.OrderPaymentRequestDTO;
import com.joel.gestion_snack.model.dto.OrderRequestDTO;
import com.joel.gestion_snack.model.entity.OrderStatus;
import com.joel.gestion_snack.model.entity.OrderType;
import com.joel.gestion_snack.service.interfaces.IOrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Implémentation du contrôleur pour la gestion des commandes
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Commandes", description = "API pour la gestion des commandes")
public class OrderControllerImpl {

    private final IOrderService orderService;

    @GetMapping
    @Operation(summary = "Récupérer toutes les commandes")
    public ResponseEntity<List<OrderDTO>> getAllOrders() {
        log.info("Requête GET pour récupérer toutes les commandes");
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Récupérer une commande par son ID")
    public ResponseEntity<OrderDTO> getOrderById(@PathVariable Long id) {
        log.info("Requête GET pour récupérer la commande avec l'ID: {}", id);
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PostMapping
    @Operation(summary = "Créer une nouvelle commande")
    public ResponseEntity<OrderDTO> createOrder(@Valid @RequestBody OrderRequestDTO requestDTO) {
        log.info("Requête POST pour créer une nouvelle commande");
        OrderDTO order = orderService.createOrder(requestDTO);
        return ResponseEntity.status(HttpStatus.CREATED).body(order);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Mettre à jour une commande")
    public ResponseEntity<OrderDTO> updateOrder(@PathVariable Long id,
            @Valid @RequestBody OrderRequestDTO requestDTO) {
        log.info("Requête PUT pour mettre à jour la commande avec l'ID: {}", id);
        return ResponseEntity.ok(orderService.updateOrder(id, requestDTO));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Supprimer une commande")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        log.info("Requête DELETE pour supprimer la commande avec l'ID: {}", id);
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/status/{status}")
    @Operation(summary = "Récupérer les commandes par statut")
    public ResponseEntity<List<OrderDTO>> getOrdersByStatus(@PathVariable OrderStatus status) {
        log.info("Requête GET pour récupérer les commandes avec le statut: {}", status);
        return ResponseEntity.ok(orderService.getOrdersByStatus(status));
    }

    @GetMapping("/type/{orderType}")
    @Operation(summary = "Récupérer les commandes par type")
    public ResponseEntity<List<OrderDTO>> getOrdersByType(@PathVariable OrderType orderType) {
        log.info("Requête GET pour récupérer les commandes de type: {}", orderType);
        return ResponseEntity.ok(orderService.getOrdersByType(orderType));
    }

    @GetMapping("/date/{date}")
    @Operation(summary = "Récupérer les commandes par date")
    public ResponseEntity<List<OrderDTO>> getOrdersByDate(
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Requête GET pour récupérer les commandes de la date: {}", date);
        return ResponseEntity.ok(orderService.getOrdersByDate(date));
    }

    @GetMapping("/customer/{customerId}")
    @Operation(summary = "Récupérer les commandes d'un client")
    public ResponseEntity<List<OrderDTO>> getOrdersByCustomer(@PathVariable Long customerId) {
        log.info("Requête GET pour récupérer les commandes du client avec l'ID: {}", customerId);
        return ResponseEntity.ok(orderService.getOrdersByCustomer(customerId));
    }

    @GetMapping("/status/{status}/date/{date}")
    @Operation(summary = "Récupérer les commandes par statut et date")
    public ResponseEntity<List<OrderDTO>> getOrdersByStatusAndDate(
            @PathVariable OrderStatus status,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Requête GET pour récupérer les commandes avec le statut: {} et la date: {}", status, date);
        return ResponseEntity.ok(orderService.getOrdersByStatusAndDate(status, date));
    }

    @GetMapping("/customer/{customerId}/date/{date}")
    @Operation(summary = "Récupérer les commandes d'un client par date")
    public ResponseEntity<List<OrderDTO>> getOrdersByCustomerAndDate(
            @PathVariable Long customerId,
            @PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        log.info("Requête GET pour récupérer les commandes du client: {} avec la date: {}", customerId, date);
        return ResponseEntity.ok(orderService.getOrdersByCustomerAndDate(customerId, date));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Annuler une commande")
    public ResponseEntity<OrderDTO> cancelOrder(@PathVariable Long id) {
        log.info("Requête POST pour annuler la commande avec l'ID: {}", id);
        return ResponseEntity.ok(orderService.cancelOrder(id));
    }

    @PostMapping("/{id}/close")
    @Operation(summary = "Fermer une commande (prête en cuisine)")
    public ResponseEntity<OrderDTO> closeOrder(@PathVariable Long id) {
        log.info("Requête POST pour fermer la commande avec l'ID: {}", id);
        return ResponseEntity.ok(orderService.closeOrder(id));
    }

    @PostMapping("/{id}/serve")
    @Operation(summary = "Marquer une commande comme servie")
    public ResponseEntity<OrderDTO> serveOrder(@PathVariable Long id) {
        log.info("Requête POST pour marquer la commande comme servie avec l'ID: {}", id);
        return ResponseEntity.ok(orderService.serveOrder(id));
    }

    @PostMapping("/{id}/pay")
    @Operation(summary = "Enregistrer le paiement d'une commande")
    public ResponseEntity<OrderDTO> payOrder(@PathVariable Long id,
            @Valid @RequestBody OrderPaymentRequestDTO requestDTO) {
        log.info("Requête POST pour payer la commande avec l'ID: {}", id);
        return ResponseEntity.ok(orderService.payOrder(id, requestDTO));
    }

    @PostMapping("/{id}/start")
    @Operation(summary = "Démarrer la préparation d'une commande (ACTIVE → IN_PREPARATION)")
    public ResponseEntity<OrderDTO> startOrder(@PathVariable Long id) {
        log.info("Requête POST pour démarrer la préparation de la commande ID: {}", id);
        return ResponseEntity.ok(orderService.startOrder(id));
    }

    @PutMapping("/{id}/status")
    @Operation(summary = "Changer le statut d'une commande (endpoint générique)")
    public ResponseEntity<OrderDTO> updateOrderStatus(
            @PathVariable Long id,
            @RequestParam OrderStatus status) {
        log.info("Requête PUT pour changer le statut de la commande {} vers {}", id, status);
        return switch (status) {
            case IN_PREPARATION -> ResponseEntity.ok(orderService.startOrder(id));
            case CLOSED         -> ResponseEntity.ok(orderService.closeOrder(id));
            case SERVED         -> ResponseEntity.ok(orderService.serveOrder(id));
            case CANCELLED      -> ResponseEntity.ok(orderService.cancelOrder(id));
            default             -> ResponseEntity.badRequest().build();
        };
    }
}
