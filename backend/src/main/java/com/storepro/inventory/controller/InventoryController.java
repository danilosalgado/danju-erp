package com.storepro.inventory.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import com.storepro.inventory.dto.CreateMovementRequest;
import com.storepro.inventory.dto.MovementResponse;
import com.storepro.inventory.entity.MovementType;
import com.storepro.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/inventory")
@RequiredArgsConstructor
@Tag(name = "Estoque", description = "Movimentações e controle de estoque")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'ESTOQUISTA')")
    @Operation(summary = "Registrar movimentação de estoque")
    public ResponseEntity<ApiResponse<MovementResponse>> createMovement(
            @Valid @RequestBody CreateMovementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Movimentação registrada", inventoryService.createMovement(request)));
    }

    @GetMapping("/movements")
    @Operation(summary = "Listar movimentações com filtros")
    public ResponseEntity<ApiResponse<PageResponse<MovementResponse>>> listMovements(
            @RequestParam(required = false) UUID productId,
            @RequestParam(required = false) MovementType type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                inventoryService.list(productId, type, startDate, endDate, page, size)));
    }

    @GetMapping("/movements/product/{productId}")
    @Operation(summary = "Histórico de movimentações de um produto")
    public ResponseEntity<ApiResponse<PageResponse<MovementResponse>>> productHistory(
            @PathVariable UUID productId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getProductHistory(productId, page, size)));
    }
}
