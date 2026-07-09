package com.joel.gestion_snack.controller.implementations;

import com.joel.gestion_snack.model.dto.RoleDTO;
import com.joel.gestion_snack.model.entity.Role;
import com.joel.gestion_snack.repository.RoleRepository;
import com.joel.gestion_snack.utils.MapperUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/roles")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Roles", description = "API pour la gestion des roles")
public class RoleControllerImpl {

    private final RoleRepository roleRepository;
    private final MapperUtil mapperUtil;

    @GetMapping
    @Operation(summary = "Recuperer tous les roles")
    public ResponseEntity<List<RoleDTO>> getAllRoles() {
        log.info("Requete GET pour recuperer tous les roles");
        List<RoleDTO> roles = roleRepository.findAll()
                .stream()
                .map(mapperUtil::toRoleDTO)
                .toList();
        return ResponseEntity.ok(roles);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Recuperer un role par son ID")
    public ResponseEntity<RoleDTO> getRoleById(@PathVariable Long id) {
        log.info("Requete GET pour recuperer le role avec l'ID: {}", id);
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role non trouve avec l'ID: " + id));
        return ResponseEntity.ok(mapperUtil.toRoleDTO(role));
    }
}
