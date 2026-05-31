package com.joel.gestion_snack.service.implementations;

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
        }
    }
}
