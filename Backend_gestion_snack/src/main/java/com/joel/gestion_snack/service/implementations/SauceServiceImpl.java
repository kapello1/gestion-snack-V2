package com.joel.gestion_snack.service.implementations;

import com.joel.gestion_snack.model.dto.SauceDTO;
import com.joel.gestion_snack.model.entity.Sauce;
import com.joel.gestion_snack.repository.SauceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SauceServiceImpl {

    private final SauceRepository sauceRepository;

    public List<SauceDTO> getAllSauces() {
        return sauceRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public List<SauceDTO> getAvailableSauces() {
        return sauceRepository.findByIsAvailableTrue().stream().map(this::toDTO).collect(Collectors.toList());
    }

    public SauceDTO getSauceById(Long id) {
        return sauceRepository.findById(id)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Sauce non trouvée: " + id));
    }

    public SauceDTO createSauce(SauceDTO dto) {
        Sauce sauce = toEntity(dto);
        return toDTO(sauceRepository.save(sauce));
    }

    public SauceDTO updateSauce(Long id, SauceDTO dto) {
        Sauce sauce = sauceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sauce non trouvée: " + id));
        sauce.setName(dto.getName());
        sauce.setPrice(dto.getPrice());
        sauce.setDescription(dto.getDescription());
        sauce.setIsAvailable(dto.getIsAvailable() != null ? dto.getIsAvailable() : true);
        return toDTO(sauceRepository.save(sauce));
    }

    public void deleteSauce(Long id) {
        sauceRepository.deleteById(id);
    }

    private SauceDTO toDTO(Sauce s) {
        return new SauceDTO(s.getSauceId(), s.getName(), s.getPrice(), s.getDescription(), s.getIsAvailable(), s.getCreatedAt(), s.getUpdatedAt());
    }

    private Sauce toEntity(SauceDTO dto) {
        Sauce s = new Sauce();
        s.setName(dto.getName());
        s.setPrice(dto.getPrice());
        s.setDescription(dto.getDescription());
        s.setIsAvailable(dto.getIsAvailable() != null ? dto.getIsAvailable() : true);
        return s;
    }
}
