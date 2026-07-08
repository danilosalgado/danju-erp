package com.storepro.user.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import com.storepro.user.dto.CreateUserRequest;
import com.storepro.user.dto.UpdateUserRequest;
import com.storepro.user.dto.UserResponse;
import com.storepro.user.entity.Role;
import com.storepro.user.service.UserService;
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
@RequestMapping("/users")
@RequiredArgsConstructor
@Tag(name = "Usuários", description = "Gerenciamento de usuários do sistema")
public class UserController {

    private final UserService userService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Criar novo usuário")
    public ResponseEntity<ApiResponse<UserResponse>> create(@Valid @RequestBody CreateUserRequest request) {
        UserResponse user = userService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Usuário criado com sucesso", user));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Buscar usuário por ID")
    public ResponseEntity<ApiResponse<UserResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(userService.getById(id)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Listar usuários com filtros")
    public ResponseEntity<ApiResponse<PageResponse<UserResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean active,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(userService.list(search, role, active, page, size)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Atualizar usuário")
    public ResponseEntity<ApiResponse<UserResponse>> update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Usuário atualizado com sucesso", userService.update(id, request)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Desativar usuário")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        userService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Usuário desativado com sucesso", null));
    }
}
