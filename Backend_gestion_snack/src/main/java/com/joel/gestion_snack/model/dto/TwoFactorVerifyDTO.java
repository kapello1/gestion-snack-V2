package com.joel.gestion_snack.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class TwoFactorVerifyDTO {

    @NotNull(message = "L'identifiant utilisateur est obligatoire")
    private Long userId;

    @NotBlank(message = "Le code de vérification est obligatoire")
    @Pattern(regexp = "\\d{6}", message = "Le code doit contenir exactement 6 chiffres")
    private String code;
}
