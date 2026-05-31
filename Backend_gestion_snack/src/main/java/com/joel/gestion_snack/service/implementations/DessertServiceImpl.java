package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.DessertDTO;
import com.joel.gestion_snack.model.entity.Dessert;
import com.joel.gestion_snack.repository.DessertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DessertServiceImpl {

    private final DessertRepository dessertRepository;

    public List<DessertDTO> getAllDesserts() {
        return dessertRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<DessertDTO> getAvailableDesserts() {
        return dessertRepository.findByIsAvailableTrue().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public DessertDTO getDessertById(Long id) {
        return dessertRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Dessert non trouvé: " + id));
    }

    public DessertDTO createDessert(DessertDTO dto) {
        Dessert dessert = toEntity(dto);
        return toDTO(dessertRepository.save(dessert));
    }

    public DessertDTO updateDessert(Long id, DessertDTO dto) {
        Dessert dessert = dessertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Dessert non trouvé: " + id));
        dessert.setName(dto.getName());
        dessert.setPrice(dto.getPrice());
        dessert.setDescription(dto.getDescription());
        dessert.setIsAvailable(dto.getIsAvailable() != null ? dto.getIsAvailable() : true);
        return toDTO(dessertRepository.save(dessert));
    }

    public void deleteDessert(Long id) {
        dessertRepository.deleteById(id);
    }

    private DessertDTO toDTO(Dessert d) {
        return new DessertDTO(d.getDessertId(), d.getName(), d.getPrice(), d.getDescription(), d.getIsAvailable(), d.getCreatedAt(), d.getUpdatedAt());
    }

    private Dessert toEntity(DessertDTO dto) {
        Dessert d = new Dessert();
        d.setName(dto.getName());
        d.setPrice(dto.getPrice());
        d.setDescription(dto.getDescription());
        d.setIsAvailable(dto.getIsAvailable() != null ? dto.getIsAvailable() : true);
        return d;
    }
}
