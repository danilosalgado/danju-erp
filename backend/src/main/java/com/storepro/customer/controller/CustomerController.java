package com.storepro.customer.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import com.storepro.customer.dto.CreateCustomerRequest;
import com.storepro.customer.dto.CustomerResponse;
import com.storepro.customer.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/customers")
@RequiredArgsConstructor
@Tag(name = "Clientes", description = "Gerenciamento de clientes e fidelidade")
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    @Operation(summary = "Cadastrar cliente")
    public ResponseEntity<ApiResponse<CustomerResponse>> create(@Valid @RequestBody CreateCustomerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cliente cadastrado", customerService.create(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar cliente por ID")
    public ResponseEntity<ApiResponse<CustomerResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getById(id)));
    }

    @GetMapping
    @Operation(summary = "Listar clientes")
    public ResponseEntity<ApiResponse<PageResponse<CustomerResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(customerService.list(search, active, page, size)));
    }
}
