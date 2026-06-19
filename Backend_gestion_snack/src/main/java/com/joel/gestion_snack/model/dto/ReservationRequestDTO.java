package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ReservationRequestDTO {

    @NotNull(message = "L'ID du client est obligatoire")
    private Long customerId;

    // ── Mode client : créneau automatique (guests + date + time) ─────────────
    private Integer guests;
    private String date;   // "YYYY-MM-DD"
    private String time;   // "HH:mm"

    // ── Mode admin : table + plages horaires explicites ───────────────────────
    private Long tableId;
    private LocalDateTime datetimeFrom;
    private LocalDateTime datetimeTo;
    @Min(value = 1, message = "Le nombre de places doit être au moins 1")
    private Integer places;

    private String attribut55;
    private String createdBy;
}

