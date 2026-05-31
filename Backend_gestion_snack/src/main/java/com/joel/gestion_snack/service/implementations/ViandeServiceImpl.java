package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.ViandeDTO;
import com.joel.gestion_snack.model.entity.Viande;
import com.joel.gestion_snack.repository.ViandeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ViandeServiceImpl {

    private final ViandeRepository viandeRepository;

    public List<ViandeDTO> getAllViandes() {
        return viandeRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<ViandeDTO> getAvailableViandes() {
        return viandeRepository.findByIsAvailableTrue().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public ViandeDTO getViandeById(Long id) {
        return viandeRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Viande non trouvée: " + id));
    }

    public ViandeDTO createViande(ViandeDTO dto) {
        Viande viande = toEntity(dto);
        return toDTO(viandeRepository.save(viande));
    }

    public ViandeDTO updateViande(Long id, ViandeDTO dto) {
        Viande viande = viandeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Viande non trouvée: " + id));
        viande.setName(dto.getName());
        viande.setPrice(dto.getPrice());
        viande.setDescription(dto.getDescription());
        viande.setIsAvailable(dto.getIsAvailable() != null ? dto.getIsAvailable() : true);
        return toDTO(viandeRepository.save(viande));
    }

    public void deleteViande(Long id) {
        viandeRepository.deleteById(id);
    }

    private ViandeDTO toDTO(Viande v) {
        return new ViandeDTO(v.getViandeId(), v.getName(), v.getPrice(), v.getDescription(), v.getIsAvailable(), v.getCreatedAt(), v.getUpdatedAt());
    }

    private Viande toEntity(ViandeDTO dto) {
        Viande v = new Viande();
        v.setName(dto.getName());
        v.setPrice(dto.getPrice());
        v.setDescription(dto.getDescription());
        v.setIsAvailable(dto.getIsAvailable() != null ? dto.getIsAvailable() : true);
        return v;
    }
}
