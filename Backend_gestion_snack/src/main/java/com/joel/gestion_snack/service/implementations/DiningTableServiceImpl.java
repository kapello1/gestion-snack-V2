package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.config.WebSocketEventPublisher;
import com.joel.gestion_snack.model.dto.DiningTableDTO;
import com.joel.gestion_snack.model.dto.DiningTableRequestDTO;
import com.joel.gestion_snack.model.entity.DiningTable;
import com.joel.gestion_snack.model.entity.Reservation;
import com.joel.gestion_snack.model.entity.ReservationStatus;
import com.joel.gestion_snack.model.entity.TableStatusType;
import com.joel.gestion_snack.repository.DiningTableRepository;
import com.joel.gestion_snack.repository.ReservationRepository;
import com.joel.gestion_snack.service.interfaces.IDiningTableService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des tables
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class DiningTableServiceImpl implements IDiningTableService {

    private final DiningTableRepository diningTableRepository;
    private final ReservationRepository reservationRepository;
    private final com.joel.gestion_snack.repository.OrderRepository orderRepository;
    private final MapperUtil mapperUtil;
    private final WebSocketEventPublisher wsPublisher;

    @Override
    @Transactional(readOnly = true)
    public List<DiningTableDTO> getAllTables() {
        log.info("Récupération de toutes les tables");
        return diningTableRepository.findAll().stream()
                .map(table -> {
                    DiningTableDTO dto = mapperUtil.toDiningTableDTO(table);
                    Integer occupied = orderRepository.sumGuestCountByTableIdAndStatus(table.getTableId(),
                            com.joel.gestion_snack.model.entity.OrderStatus.ACTIVE);
                    dto.setOccupiedSeats(occupied != null ? occupied : 0);

                    // Populate active reservation info if table is reserved
                    if (table.getStatus() == TableStatusType.RESERVED) {
                        enrichWithReservationInfo(dto, table.getTableId());
                    }

                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public DiningTableDTO getTableById(@lombok.NonNull Long id) {
        log.info("Récupération de la table avec l'ID: {}", id);
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Table non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Table non trouvée avec l'ID: " + id);
                });
        DiningTableDTO dto = mapperUtil.toDiningTableDTO(table);
        Integer occupied = orderRepository.sumGuestCountByTableIdAndStatus(table.getTableId(),
                com.joel.gestion_snack.model.entity.OrderStatus.ACTIVE);
        dto.setOccupiedSeats(occupied != null ? occupied : 0);

        if (table.getStatus() == TableStatusType.RESERVED) {
            enrichWithReservationInfo(dto, table.getTableId());
        }

        return dto;
    }

    @Override
    public DiningTableDTO createTable(DiningTableRequestDTO requestDTO) {
        log.info("Création d'une nouvelle table: {}", requestDTO.getTableNumber());
        if (diningTableRepository.findByTableNumber(requestDTO.getTableNumber()).isPresent()) {
            log.error("Une table avec le numéro {} existe déjà", requestDTO.getTableNumber());
            throw new IllegalArgumentException("Une table avec ce numéro existe déjà");
        }
        DiningTable table = mapperUtil.toDiningTable(requestDTO);
        table = diningTableRepository.save(table);
        log.info("Table créée avec succès avec l'ID: {}", table.getTableId());
        wsPublisher.publishTableEvent("TABLE_CREATED", table.getTableId());
        return mapperUtil.toDiningTableDTO(table);
    }

    @Override
    public DiningTableDTO updateTable(@lombok.NonNull Long id, DiningTableRequestDTO requestDTO) {
        log.info("Mise à jour de la table avec l'ID: {}", id);
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Table non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Table non trouvée avec l'ID: " + id);
                });
        table.setTableNumber(requestDTO.getTableNumber());
        table.setCapacity(requestDTO.getCapacity());
        if (requestDTO.getStatus() != null) {
            table.setStatus(requestDTO.getStatus());
        }
        table.setUpdatedBy(requestDTO.getCreatedBy());
        table = diningTableRepository.save(table);
        log.info("Table mise à jour avec succès avec l'ID: {}", table.getTableId());
        wsPublisher.publishTableEvent("TABLE_UPDATED", table.getTableId());
        return mapperUtil.toDiningTableDTO(table);
    }

    @Override
    public void deleteTable(@lombok.NonNull Long id) {
        log.info("Suppression de la table avec l'ID: {}", id);
        if (!diningTableRepository.existsById(id)) {
            log.error("Table non trouvée avec l'ID: {}", id);
            throw new EntityNotFoundException("Table non trouvée avec l'ID: " + id);
        }
        diningTableRepository.deleteById(id);
        log.info("Table supprimée avec succès avec l'ID: {}", id);
        wsPublisher.publishTableEvent("TABLE_DELETED", id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DiningTableDTO> getTablesByStatus(TableStatusType status) {
        log.info("Récupération des tables avec le statut: {}", status);
        return diningTableRepository.findByStatus(status).stream()
                .map(mapperUtil::toDiningTableDTO)
                .collect(Collectors.toList());
    }

    @Override
    public DiningTableDTO updateTableStatus(@lombok.NonNull Long id, TableStatusType status) {
        log.info("Mise à jour du statut de la table {} vers {}", id, status);
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Table non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Table non trouvée avec l'ID: " + id);
                });
        table.setStatus(status);
        table.setUpdatedBy("SYSTEM");
        table = diningTableRepository.save(table);
        log.info("Statut de la table mis à jour avec succès");
        wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", table.getTableId());
        return mapperUtil.toDiningTableDTO(table);
    }

    @Override
    public DiningTableDTO releaseTable(@lombok.NonNull Long id) {
        log.info("Libération de la table avec l'ID: {}", id);
        DiningTable table = diningTableRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Table non trouvée avec l'ID: " + id));

        if (table.getStatus() == TableStatusType.FREE) {
            return mapperUtil.toDiningTableDTO(table);
        }

        // Cas : table RESERVED — clôturer la réservation et libérer
        if (table.getStatus() == TableStatusType.RESERVED) {
            List<Reservation> reservations = reservationRepository.findByTable_TableId(id);
            reservations.stream()
                    .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
                    .forEach(r -> {
                        r.setStatus(ReservationStatus.COMPLETED);
                        r.setUpdatedBy("SYSTEM");
                        reservationRepository.save(r);
                    });
            table.setStatus(TableStatusType.FREE);
            table.setUpdatedBy("SYSTEM");
            table = diningTableRepository.save(table);
            wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", table.getTableId());
            log.info("Table {} libérée — réservation(s) clôturée(s)", id);
            return mapperUtil.toDiningTableDTO(table);
        }

        // Cas : table OCCUPIED — vérifier l'état des commandes
        List<com.joel.gestion_snack.model.entity.Order> orders =
                orderRepository.findByTable_TableId(id);

        // Chercher une commande non terminée (ACTIVE ou CLOSED = prête mais pas encore servie)
        boolean hasActiveOrder = orders.stream().anyMatch(
                o -> o.getStatus() == com.joel.gestion_snack.model.entity.OrderStatus.ACTIVE);
        boolean hasClosedNotServed = orders.stream().anyMatch(
                o -> o.getStatus() == com.joel.gestion_snack.model.entity.OrderStatus.CLOSED);

        if (hasActiveOrder) {
            throw new IllegalStateException(
                    "Impossible de libérer la table : une commande est en cours de préparation. "
                    + "Veuillez d'abord terminer la commande.");
        }
        if (hasClosedNotServed) {
            throw new IllegalStateException(
                    "Impossible de libérer la table : la commande est prête mais n'a pas encore été servie. "
                    + "Veuillez d'abord servir la commande.");
        }

        // Toutes les commandes sont SERVED ou CANCELLED — libération autorisée
        table.setStatus(TableStatusType.FREE);
        table.setUpdatedBy("SYSTEM");
        table = diningTableRepository.save(table);
        wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", table.getTableId());
        log.info("Table {} libérée avec succès", id);
        return mapperUtil.toDiningTableDTO(table);
    }

    private void enrichWithReservationInfo(DiningTableDTO dto, Long tableId) {
        List<Reservation> reservations = reservationRepository.findByTable_TableId(tableId);
        Reservation activeRes = reservations.stream()
                .filter(r -> r.getStatus() == ReservationStatus.BOOKED)
                .filter(r -> r.getDatetimeFrom() != null && !r.getDatetimeFrom().isBefore(LocalDateTime.now()))
                .sorted((r1, r2) -> r1.getDatetimeFrom().compareTo(r2.getDatetimeFrom()))
                .findFirst()
                .orElse(null);

        if (activeRes != null) {
            dto.setActiveReservationId(activeRes.getReservationId());
            dto.setReservedForCustomerId(activeRes.getCustomer().getCustomerId());
            dto.setReservedForCustomerName(
                    activeRes.getCustomer().getFirstName() + " " + activeRes.getCustomer().getLastName());
            dto.setActiveReservationDate(activeRes.getDatetimeFrom());
            dto.setReservedForCustomerPhone(activeRes.getCustomer().getPhone());
            dto.setReservedForCustomerEmail(activeRes.getCustomer().getEmail());
            dto.setReservationPlaces(activeRes.getPlaces());
        }
    }
}
