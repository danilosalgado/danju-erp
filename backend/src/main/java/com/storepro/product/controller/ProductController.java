package com.storepro.product.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import com.storepro.product.dto.CreateProductRequest;
import com.storepro.product.dto.ProductResponse;
import com.storepro.product.dto.UpdateProductRequest;
import com.storepro.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/products")
@RequiredArgsConstructor
@Tag(name = "Produtos", description = "Gerenciamento de produtos")
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'ESTOQUISTA')")
    @Operation(summary = "Cadastrar produto")
    public ResponseEntity<ApiResponse<ProductResponse>> create(@Valid @RequestBody CreateProductRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Produto cadastrado", productService.create(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar produto por ID")
    public ResponseEntity<ApiResponse<ProductResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(productService.getById(id)));
    }

    @GetMapping("/barcode/{barcode}")
    @Operation(summary = "Buscar produto por código de barras")
    public ResponseEntity<ApiResponse<ProductResponse>> getByBarcode(@PathVariable String barcode) {
        return ResponseEntity.ok(ApiResponse.success(productService.getByBarcode(barcode)));
    }

    @GetMapping
    @Operation(summary = "Listar produtos com filtros")
    public ResponseEntity<ApiResponse<PageResponse<ProductResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID categoryId,
            @RequestParam(required = false) UUID supplierId,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                productService.list(search, categoryId, supplierId, active, page, size)));
    }

    @GetMapping("/low-stock")
    @Operation(summary = "Listar produtos com estoque baixo")
    public ResponseEntity<ApiResponse<List<ProductResponse>>> getLowStock() {
        return ResponseEntity.ok(ApiResponse.success(productService.getLowStock()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'ESTOQUISTA')")
    @Operation(summary = "Atualizar produto")
    public ResponseEntity<ApiResponse<ProductResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody UpdateProductRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Produto atualizado", productService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Desativar produto")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        productService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Produto desativado", null));
    }
}
