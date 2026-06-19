package com.joel.gestion_snack.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AvailabilitySlotDTO {
    /** Heure du créneau au format "HH:mm" (heure locale Bruxelles) */
    private String time;
    /** Nombre de tables encore disponibles sur ce créneau pour le nombre de guests demandé */
    private int availableTables;
}
