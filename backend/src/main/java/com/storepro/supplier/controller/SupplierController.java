package com.storepro.supplier.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import com.storepro.supplier.dto.CreateSupplierRequest;
import com.storepro.supplier.dto.SupplierResponse;
import com.storepro.supplier.dto.UpdateSupplierRequest;
import com.storepro.supplier.service.SupplierService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/suppliers")
@RequiredArgsConstructor
@Tag(name = "Fornecedores", description = "Gerenciamento de fornecedores")
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'ESTOQUISTA')")
    @Operation(summary = "Cadastrar fornecedor")
    public ResponseEntity<ApiResponse<SupplierResponse>> create(@Valid @RequestBody CreateSupplierRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Fornecedor cadastrado", supplierService.create(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar fornecedor por ID")
    public ResponseEntity<ApiResponse<SupplierResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(supplierService.getById(id)));
    }

    @GetMapping
    @Operation(summary = "Listar fornecedores com filtros")
    public ResponseEntity<ApiResponse<PageResponse<SupplierResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(supplierService.list(search, active, page, size)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Atualizar fornecedor")
    public ResponseEntity<ApiResponse<SupplierResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody UpdateSupplierRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Fornecedor atualizado", supplierService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Desativar fornecedor")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        supplierService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Fornecedor desativado", null));
    }
}
