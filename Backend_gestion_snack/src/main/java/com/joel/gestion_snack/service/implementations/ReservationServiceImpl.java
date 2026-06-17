package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.ReservationDTO;
import com.joel.gestion_snack.model.dto.ReservationRequestDTO;
import com.joel.gestion_snack.model.entity.*;
import com.joel.gestion_snack.repository.CustomerRepository;
import com.joel.gestion_snack.repository.DiningTableRepository;
import com.joel.gestion_snack.repository.ReservationRepository;
import com.joel.gestion_snack.config.WebSocketEventPublisher;
import com.joel.gestion_snack.service.EmailService;
import com.joel.gestion_snack.service.interfaces.IReservationService;
import com.joel.gestion_snack.utils.MapperUtil;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Implémentation du service pour la gestion des réservations
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReservationServiceImpl implements IReservationService {
    
    private final ReservationRepository reservationRepository;
    private final CustomerRepository customerRepository;
    private final DiningTableRepository diningTableRepository;
    private final MapperUtil mapperUtil;
    private final EmailService emailService;
    private final WebSocketEventPublisher wsPublisher;
    
    @Override
    @Transactional(readOnly = true)
    public List<ReservationDTO> getAllReservations() {
        log.info("Récupération de toutes les réservations");
        return reservationRepository.findAll().stream()
                .map(mapperUtil::toReservationDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public ReservationDTO getReservationById(Long id) {
        log.info("Récupération de la réservation avec l'ID: {}", id);
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Réservation non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Réservation non trouvée avec l'ID: " + id);
                });
        return mapperUtil.toReservationDTO(reservation);
    }
    
    @Override
    public ReservationDTO createReservation(ReservationRequestDTO requestDTO) {
        log.info("Création d'une nouvelle réservation");
        Customer customer = customerRepository.findById(requestDTO.getCustomerId())
                .orElseThrow(() -> {
                    log.error("Client non trouvé avec l'ID: {}", requestDTO.getCustomerId());
                    return new EntityNotFoundException("Client non trouvé");
                });
        DiningTable table = diningTableRepository.findById(requestDTO.getTableId())
                .orElseThrow(() -> {
                    log.error("Table non trouvée avec l'ID: {}", requestDTO.getTableId());
                    return new EntityNotFoundException("Table non trouvée");
                });
        
        if (table.getStatus() != TableStatusType.FREE) {
            log.error("La table {} n'est pas disponible", table.getTableId());
            throw new IllegalStateException("La table n'est pas disponible");
        }
        
        if (table.getCapacity() < requestDTO.getPlaces()) {
            log.error("La capacité de la table {} est insuffisante", table.getTableId());
            throw new IllegalArgumentException("La capacité de la table est insuffisante");
        }
        
        Reservation reservation = mapperUtil.toReservation(requestDTO);
        reservation.setCustomer(customer);
        reservation.setTable(table);
        reservation = reservationRepository.save(reservation);

        // Mettre à jour le statut de la table
        table.setStatus(TableStatusType.RESERVED);
        diningTableRepository.save(table);

        // Email de confirmation (non bloquant)
        if (emailService.isConfigured() && customer.getEmail() != null) {
            try {
                String customerName = customer.getFirstName() + " " + customer.getLastName();
                DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
                DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm");
                emailService.sendReservationConfirmationEmail(
                        customer.getEmail(),
                        customerName,
                        customer.getPhone() != null ? customer.getPhone() : "N/A",
                        table.getCapacity(),
                        reservation.getPlaces(),
                        reservation.getDatetimeFrom().format(dateFmt),
                        reservation.getDatetimeFrom().format(timeFmt),
                        String.valueOf(table.getTableNumber())
                );
            } catch (Exception e) {
                log.warn("Échec envoi email confirmation réservation ID={} : {}", reservation.getReservationId(), e.getMessage());
            }
        } else {
            log.info("Email non configuré ou absent - confirmation non envoyée pour réservation ID={}", reservation.getReservationId());
        }

        wsPublisher.publishReservationEvent("RESERVATION_CREATED", reservation.getReservationId());
        log.info("Réservation créée avec succès avec l'ID: {}", reservation.getReservationId());
        return mapperUtil.toReservationDTO(reservation);
    }
    
    @Override
    public ReservationDTO updateReservation(Long id, ReservationRequestDTO requestDTO) {
        log.info("Mise à jour de la réservation avec l'ID: {}", id);
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Réservation non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Réservation non trouvée");
                });
        
        if (requestDTO.getCustomerId() != null) {
            Customer customer = customerRepository.findById(requestDTO.getCustomerId())
                    .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));
            reservation.setCustomer(customer);
        }
        
        if (requestDTO.getTableId() != null) {
            DiningTable table = diningTableRepository.findById(requestDTO.getTableId())
                    .orElseThrow(() -> new EntityNotFoundException("Table non trouvée"));
            reservation.setTable(table);
        }
        
        reservation.setDatetimeFrom(requestDTO.getDatetimeFrom());
        reservation.setDatetimeTo(requestDTO.getDatetimeTo());
        reservation.setPlaces(requestDTO.getPlaces());
        reservation.setAttribut55(requestDTO.getAttribut55());
        reservation.setUpdatedBy(requestDTO.getCreatedBy());
        
        reservation = reservationRepository.save(reservation);
        log.info("Réservation mise à jour avec succès");
        return mapperUtil.toReservationDTO(reservation);
    }
    
    @Override
    public void deleteReservation(Long id) {
        log.info("Suppression de la réservation avec l'ID: {}", id);
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Réservation non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Réservation non trouvée");
                });
        
        // Libérer la table
        DiningTable table = reservation.getTable();
        table.setStatus(TableStatusType.FREE);
        diningTableRepository.save(table);
        
        reservationRepository.deleteById(id);
        wsPublisher.publishReservationEvent("RESERVATION_DELETED", id);
        log.info("Réservation supprimée avec succès");
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByStatus(ReservationStatus status) {
        log.info("Récupération des réservations avec le statut: {}", status);
        return reservationRepository.findByStatus(status).stream()
                .map(mapperUtil::toReservationDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByDate(LocalDate date) {
        log.info("Récupération des réservations de la date: {}", date);
        java.time.LocalDateTime start = date.atStartOfDay();
        java.time.LocalDateTime end = date.plusDays(1).atStartOfDay();
        return reservationRepository.findByDatetimeFromBetween(start, end).stream()
                .map(mapperUtil::toReservationDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByCustomer(Long customerId) {
        log.info("Récupération des réservations du client avec l'ID: {}", customerId);
        return reservationRepository.findByCustomer_CustomerId(customerId).stream()
                .map(mapperUtil::toReservationDTO)
                .collect(Collectors.toList());
    }
    
    @Override
    public ReservationDTO cancelReservation(Long id) {
        log.info("Annulation de la réservation avec l'ID: {}", id);
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Réservation non trouvée avec l'ID: {}", id);
                    return new EntityNotFoundException("Réservation non trouvée");
                });
        
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setUpdatedBy("SYSTEM");
        reservation = reservationRepository.save(reservation);

        // Libérer la table si elle était encore RESERVED pour cette réservation
        DiningTable table = reservation.getTable();
        if (table != null && table.getStatus() == com.joel.gestion_snack.model.entity.TableStatusType.RESERVED) {
            table.setStatus(com.joel.gestion_snack.model.entity.TableStatusType.FREE);
            table.setUpdatedBy("SYSTEM");
            diningTableRepository.save(table);
            wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", table.getTableId());
            log.info("Table {} repassée à FREE suite à l'annulation de la réservation {}", table.getTableId(), id);
        }

        wsPublisher.publishReservationEvent("RESERVATION_CANCELLED", reservation.getReservationId());
        log.info("Réservation {} annulée avec succès", id);
        return mapperUtil.toReservationDTO(reservation);
    }
}

