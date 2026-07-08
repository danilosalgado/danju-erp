package com.storepro.category.controller;

import com.storepro.category.dto.CategoryResponse;
import com.storepro.category.dto.CreateCategoryRequest;
import com.storepro.category.dto.UpdateCategoryRequest;
import com.storepro.category.service.CategoryService;
import com.storepro.common.dto.ApiResponse;
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
@RequestMapping("/categories")
@RequiredArgsConstructor
@Tag(name = "Categorias", description = "Gerenciamento de categorias e subcategorias")
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Criar categoria")
    public ResponseEntity<ApiResponse<CategoryResponse>> create(@Valid @RequestBody CreateCategoryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Categoria criada", categoryService.create(request)));
    }

    @GetMapping("/tree")
    @Operation(summary = "Listar categorias em árvore")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getTree() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getTree()));
    }

    @GetMapping
    @Operation(summary = "Listar todas as categorias (flat)")
    public ResponseEntity<ApiResponse<List<CategoryResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getAll()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar categoria por ID")
    public ResponseEntity<ApiResponse<CategoryResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(categoryService.getById(id)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Atualizar categoria")
    public ResponseEntity<ApiResponse<CategoryResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody UpdateCategoryRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Categoria atualizada", categoryService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Desativar categoria")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        categoryService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Categoria desativada", null));
    }
}
