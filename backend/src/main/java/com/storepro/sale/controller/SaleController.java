package com.storepro.sale.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import com.storepro.sale.dto.CreateSaleRequest;
import com.storepro.sale.dto.SaleResponse;
import com.storepro.sale.service.SaleService;
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
@RequestMapping("/sales")
@RequiredArgsConstructor
@Tag(name = "Vendas / PDV", description = "Ponto de venda e histórico de vendas")
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'CAIXA')")
    @Operation(summary = "Registrar nova venda")
    public ResponseEntity<ApiResponse<SaleResponse>> create(@Valid @RequestBody CreateSaleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Venda registrada", saleService.createSale(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar venda por ID")
    public ResponseEntity<ApiResponse<SaleResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(saleService.getById(id)));
    }

    @GetMapping
    @Operation(summary = "Listar vendas")
    public ResponseEntity<ApiResponse<PageResponse<SaleResponse>>> list(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(saleService.list(status, startDate, endDate, page, size)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Cancelar venda")
    public ResponseEntity<ApiResponse<Void>> cancel(@PathVariable UUID id) {
        saleService.cancelSale(id);
        return ResponseEntity.ok(ApiResponse.success("Venda cancelada", null));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Editar venda finalizada")
    public ResponseEntity<ApiResponse<SaleResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody CreateSaleRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Venda atualizada", saleService.updateSale(id, request)));
    }
}
