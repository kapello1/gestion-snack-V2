package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.AvailabilitySlotDTO;
import com.joel.gestion_snack.model.dto.DiningTableDTO;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReservationServiceImpl implements IReservationService {

    // ── Paramètres de service ─────────────────────────────────────────────────
    private static final int SLOT_DURATION_MIN    = 90;
    private static final int SLOT_GRANULARITY_MIN = 30;
    private static final LocalTime LUNCH_START  = LocalTime.of(11, 0);
    private static final LocalTime LUNCH_END    = LocalTime.of(14, 0);
    private static final LocalTime DINNER_START = LocalTime.of(18, 0);
    private static final LocalTime DINNER_END   = LocalTime.of(22, 0);

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FMT  = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final ReservationRepository   reservationRepository;
    private final CustomerRepository      customerRepository;
    private final DiningTableRepository   diningTableRepository;
    private final MapperUtil              mapperUtil;
    private final EmailService            emailService;
    private final WebSocketEventPublisher wsPublisher;

    // ════════════════════════════════════════════════════════════════════════
    //  Lecture
    // ════════════════════════════════════════════════════════════════════════

    @Override @Transactional(readOnly = true)
    public List<ReservationDTO> getAllReservations() {
        return reservationRepository.findAll().stream()
                .map(mapperUtil::toReservationDTO).collect(Collectors.toList());
    }

    @Override @Transactional(readOnly = true)
    public ReservationDTO getReservationById(Long id) {
        return mapperUtil.toReservationDTO(
                reservationRepository.findById(id)
                        .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée : " + id)));
    }

    @Override @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByStatus(ReservationStatus status) {
        return reservationRepository.findByStatus(status).stream()
                .map(mapperUtil::toReservationDTO).collect(Collectors.toList());
    }

    @Override @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByDate(LocalDate date) {
        LocalDateTime start = date.atStartOfDay();
        LocalDateTime end   = date.plusDays(1).atStartOfDay();
        return reservationRepository.findByDatetimeFromBetween(start, end).stream()
                .map(mapperUtil::toReservationDTO).collect(Collectors.toList());
    }

    @Override @Transactional(readOnly = true)
    public List<ReservationDTO> getReservationsByCustomer(Long customerId) {
        return reservationRepository.findByCustomer_CustomerId(customerId).stream()
                .map(mapperUtil::toReservationDTO).collect(Collectors.toList());
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Disponibilités par créneaux
    // ════════════════════════════════════════════════════════════════════════

    @Override @Transactional(readOnly = true)
    public List<DiningTableDTO> getAvailableTablesBySlot(LocalDate date, String time, int guests) {
        LocalTime slotTime  = LocalTime.parse(time, TIME_FMT);
        LocalDateTime start = LocalDateTime.of(date, slotTime);
        LocalDateTime end   = start.plusMinutes(SLOT_DURATION_MIN);
        List<Long> occupied = reservationRepository.findOccupiedTableIdsDuringSlot(start, end);
        return diningTableRepository.findAll().stream()
                .filter(t -> t.getCapacity() >= guests && !occupied.contains(t.getTableId()))
                .sorted(Comparator.comparingInt(DiningTable::getTableNumber))
                .map(mapperUtil::toDiningTableDTO)
                .collect(Collectors.toList());
    }

    @Override @Transactional(readOnly = true)
    public List<AvailabilitySlotDTO> getAvailableSlots(LocalDate date, int guests) {
        List<DiningTable> suitableTables = diningTableRepository.findAll().stream()
                .filter(t -> t.getCapacity() >= guests)
                .collect(Collectors.toList());

        if (suitableTables.isEmpty()) return Collections.emptyList();

        List<AvailabilitySlotDTO> result = new ArrayList<>();
        for (LocalTime[] slot : buildSlotTimes()) {
            LocalDateTime slotStart = LocalDateTime.of(date, slot[0]);
            LocalDateTime slotEnd   = LocalDateTime.of(date, slot[1]);

            List<Long> occupiedIds = reservationRepository.findOccupiedTableIdsDuringSlot(slotStart, slotEnd);

            long free = suitableTables.stream()
                    .filter(t -> !occupiedIds.contains(t.getTableId()))
                    .count();

            if (free > 0) {
                result.add(new AvailabilitySlotDTO(slot[0].format(TIME_FMT), (int) free));
            }
        }
        return result;
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Création
    // ════════════════════════════════════════════════════════════════════════

    @Override
    public ReservationDTO createReservation(ReservationRequestDTO dto) {
        if (dto.getGuests() != null && dto.getDate() != null && dto.getTime() != null) {
            return createReservationBySlot(dto);
        }
        return createReservationByTable(dto);
    }

    /** Mode client : auto-sélection de la meilleure table libre sur le créneau */
    private ReservationDTO createReservationBySlot(ReservationRequestDTO dto) {
        LocalDate date = LocalDate.parse(dto.getDate());
        LocalTime time = LocalTime.parse(dto.getTime(), TIME_FMT);
        int guests     = dto.getGuests();

        LocalDateTime slotStart = LocalDateTime.of(date, time);
        LocalDateTime slotEnd   = slotStart.plusMinutes(SLOT_DURATION_MIN);

        List<Long> occupiedIds = reservationRepository.findOccupiedTableIdsDuringSlot(slotStart, slotEnd);

        // Capacité minimale suffisante → évite de bloquer une grande table pour peu de personnes
        DiningTable bestTable = diningTableRepository.findAll().stream()
                .filter(t -> t.getCapacity() >= guests && !occupiedIds.contains(t.getTableId()))
                .min(Comparator.comparingInt(DiningTable::getCapacity))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.CONFLICT, "Plus de disponibilité sur ce créneau"));

        // Verrou pessimiste + re-vérification pour éviter la race condition
        DiningTable lockedTable = diningTableRepository.findByIdForUpdate(bestTable.getTableId())
                .orElseThrow(() -> new EntityNotFoundException("Table introuvable"));

        List<Long> occupiedAfterLock = reservationRepository.findOccupiedTableIdsDuringSlot(slotStart, slotEnd);
        if (occupiedAfterLock.contains(lockedTable.getTableId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Plus de disponibilité sur ce créneau");
        }

        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));

        Reservation reservation = new Reservation();
        reservation.setCustomer(customer);
        reservation.setTable(lockedTable);
        reservation.setDatetimeFrom(slotStart);
        reservation.setDatetimeTo(slotEnd);
        reservation.setPlaces(guests);
        reservation.setStatus(ReservationStatus.BOOKED);
        reservation.setCreatedBy(dto.getCreatedBy());
        reservation = reservationRepository.save(reservation);

        // Mettre la table à RESERVED si elle n'est pas déjà occupée
        if (lockedTable.getStatus() != TableStatusType.OCCUPIED) {
            lockedTable.setStatus(TableStatusType.RESERVED);
            lockedTable.setUpdatedBy("SYSTEM");
            diningTableRepository.save(lockedTable);
            wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", lockedTable.getTableId());
        }

        sendConfirmationEmail(customer, lockedTable, reservation);
        wsPublisher.publishReservationEvent("RESERVATION_CREATED", reservation.getReservationId());
        log.info("Réservation créée (créneau) ID={} table #{}", reservation.getReservationId(), lockedTable.getTableNumber());
        return mapperUtil.toReservationDTO(reservation);
    }

    /** Mode admin : table et plages horaires fournis explicitement */
    private ReservationDTO createReservationByTable(ReservationRequestDTO dto) {
        Customer customer = customerRepository.findById(dto.getCustomerId())
                .orElseThrow(() -> new EntityNotFoundException("Client non trouvé"));
        DiningTable table = diningTableRepository.findById(dto.getTableId())
                .orElseThrow(() -> new EntityNotFoundException("Table non trouvée"));

        if (dto.getDatetimeFrom() != null && dto.getDatetimeTo() != null) {
            List<Long> occupied = reservationRepository.findOccupiedTableIdsDuringSlot(
                    dto.getDatetimeFrom(), dto.getDatetimeTo());
            if (occupied.contains(table.getTableId())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Cette table est déjà réservée sur ce créneau");
            }
        }

        if (dto.getPlaces() != null && table.getCapacity() < dto.getPlaces()) {
            throw new IllegalArgumentException("Capacité de la table insuffisante");
        }

        Reservation reservation = mapperUtil.toReservation(dto);
        reservation.setCustomer(customer);
        reservation.setTable(table);
        reservation = reservationRepository.save(reservation);

        // Mettre la table à RESERVED si elle n'est pas déjà occupée
        if (table.getStatus() != TableStatusType.OCCUPIED) {
            table.setStatus(TableStatusType.RESERVED);
            table.setUpdatedBy("SYSTEM");
            diningTableRepository.save(table);
            wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", table.getTableId());
        }

        sendConfirmationEmail(customer, table, reservation);
        wsPublisher.publishReservationEvent("RESERVATION_CREATED", reservation.getReservationId());
        log.info("Réservation créée (admin) ID={}", reservation.getReservationId());
        return mapperUtil.toReservationDTO(reservation);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Mise à jour / suppression
    // ════════════════════════════════════════════════════════════════════════

    @Override
    public ReservationDTO updateReservation(Long id, ReservationRequestDTO dto) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée : " + id));

        if (dto.getCustomerId() != null) {
            reservation.setCustomer(customerRepository.findById(dto.getCustomerId())
                    .orElseThrow(() -> new EntityNotFoundException("Client non trouvé")));
        }
        if (dto.getTableId() != null) {
            reservation.setTable(diningTableRepository.findById(dto.getTableId())
                    .orElseThrow(() -> new EntityNotFoundException("Table non trouvée")));
        }
        if (dto.getDatetimeFrom() != null) reservation.setDatetimeFrom(dto.getDatetimeFrom());
        if (dto.getDatetimeTo()   != null) reservation.setDatetimeTo(dto.getDatetimeTo());
        if (dto.getPlaces()       != null) reservation.setPlaces(dto.getPlaces());
        reservation.setAttribut55(dto.getAttribut55());
        reservation.setUpdatedBy(dto.getCreatedBy());

        return mapperUtil.toReservationDTO(reservationRepository.save(reservation));
    }

    @Override
    public void deleteReservation(Long id) {
        reservationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée : " + id));
        reservationRepository.deleteById(id);
        // Créneau libéré automatiquement : plus aucune réservation BOOKED sur cette table/heure
        wsPublisher.publishReservationEvent("RESERVATION_DELETED", id);
        log.info("Réservation {} supprimée", id);
    }

    @Override
    public ReservationDTO cancelReservation(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée : " + id));

        DiningTable tableToFree = reservation.getTable();
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setUpdatedBy("SYSTEM");
        reservation = reservationRepository.save(reservation);

        // Libérer la table si plus aucune réservation BOOKED sur celle-ci
        if (tableToFree != null && tableToFree.getStatus() == TableStatusType.RESERVED) {
            boolean hasOtherActive = reservationRepository.findByTable_TableId(tableToFree.getTableId())
                    .stream()
                    .filter(r -> !r.getReservationId().equals(id))
                    .anyMatch(r -> r.getStatus() == ReservationStatus.BOOKED);
            if (!hasOtherActive) {
                tableToFree.setStatus(TableStatusType.FREE);
                tableToFree.setUpdatedBy("SYSTEM");
                diningTableRepository.save(tableToFree);
                wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", tableToFree.getTableId());
            }
        }

        wsPublisher.publishReservationEvent("RESERVATION_CANCELLED", reservation.getReservationId());
        log.info("Réservation {} annulée", id);
        return mapperUtil.toReservationDTO(reservation);
    }

    @Override
    public ReservationDTO completeReservation(Long id) {
        Reservation reservation = reservationRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Réservation non trouvée : " + id));

        DiningTable tableToFreeOnComplete = reservation.getTable();
        reservation.setStatus(ReservationStatus.COMPLETED);
        reservation.setUpdatedBy("SYSTEM");
        reservation = reservationRepository.save(reservation);

        // Libérer la table si plus aucune réservation BOOKED sur celle-ci
        if (tableToFreeOnComplete != null && tableToFreeOnComplete.getStatus() == TableStatusType.RESERVED) {
            boolean hasOtherActive = reservationRepository.findByTable_TableId(tableToFreeOnComplete.getTableId())
                    .stream()
                    .filter(r -> !r.getReservationId().equals(id))
                    .anyMatch(r -> r.getStatus() == ReservationStatus.BOOKED);
            if (!hasOtherActive) {
                tableToFreeOnComplete.setStatus(TableStatusType.FREE);
                tableToFreeOnComplete.setUpdatedBy("SYSTEM");
                diningTableRepository.save(tableToFreeOnComplete);
                wsPublisher.publishTableEvent("TABLE_STATUS_UPDATED", tableToFreeOnComplete.getTableId());
            }
        }

        wsPublisher.publishReservationEvent("RESERVATION_COMPLETED", reservation.getReservationId());
        log.info("Réservation {} terminée (COMPLETED)", id);
        return mapperUtil.toReservationDTO(reservation);
    }

    // ════════════════════════════════════════════════════════════════════════
    //  Helpers privés
    // ════════════════════════════════════════════════════════════════════════

    private List<LocalTime[]> buildSlotTimes() {
        List<LocalTime[]> slots = new ArrayList<>();
        addPeriodSlots(slots, LUNCH_START,  LUNCH_END);
        addPeriodSlots(slots, DINNER_START, DINNER_END);
        return slots;
    }

    private void addPeriodSlots(List<LocalTime[]> slots, LocalTime start, LocalTime end) {
        LocalTime lastStart = end.minusMinutes(SLOT_DURATION_MIN);
        LocalTime cursor    = start;
        while (!cursor.isAfter(lastStart)) {
            slots.add(new LocalTime[]{ cursor, cursor.plusMinutes(SLOT_DURATION_MIN) });
            cursor = cursor.plusMinutes(SLOT_GRANULARITY_MIN);
        }
    }

    private void sendConfirmationEmail(Customer customer, DiningTable table, Reservation reservation) {
        if (!emailService.isConfigured() || customer.getEmail() == null) return;
        try {
            emailService.sendReservationConfirmationEmail(
                    customer.getEmail(),
                    customer.getFirstName() + " " + customer.getLastName(),
                    customer.getPhone() != null ? customer.getPhone() : "N/A",
                    table.getCapacity(),
                    reservation.getPlaces(),
                    reservation.getDatetimeFrom().format(DATE_FMT),
                    reservation.getDatetimeFrom().format(TIME_FMT),
                    String.valueOf(table.getTableNumber()));
        } catch (Exception e) {
            log.warn("Email confirmation non envoyé pour réservation ID={} : {}",
                    reservation.getReservationId(), e.getMessage());
        }
    }
}
