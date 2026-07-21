package com.storepro.purchase.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import com.storepro.purchase.dto.CreatePurchaseRequest;
import com.storepro.purchase.dto.PurchaseResponse;
import com.storepro.purchase.service.PurchaseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/purchases")
@RequiredArgsConstructor
@Tag(name = "Compras", description = "Registro de compras e reestoque")
public class PurchaseController {

    private final PurchaseService purchaseService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'ESTOQUISTA')")
    @Operation(summary = "Registrar nova compra")
    public ResponseEntity<ApiResponse<PurchaseResponse>> create(@Valid @RequestBody CreatePurchaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Compra registrada", purchaseService.create(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar compra por ID")
    public ResponseEntity<ApiResponse<PurchaseResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.getById(id)));
    }

    @GetMapping
    @Operation(summary = "Listar compras")
    public ResponseEntity<ApiResponse<PageResponse<PurchaseResponse>>> list(
            @RequestParam(required = false) UUID supplierId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(purchaseService.list(supplierId, startDate, endDate, page, size)));
    }
}
