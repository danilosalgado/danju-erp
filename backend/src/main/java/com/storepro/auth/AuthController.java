package com.storepro.auth;

import com.storepro.auth.dto.*;
import com.storepro.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "Login, logout, refresh token e recuperação de senha")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "Realizar login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login realizado com sucesso", response));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar token de acesso")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        LoginResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(ApiResponse.success("Token renovado com sucesso", response));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Solicitar recuperação de senha")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Se o e-mail existir, instruções serão enviadas.", null));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Resetar senha com token")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
        return ResponseEntity.ok(ApiResponse.success("Senha alterada com sucesso", null));
    }
}
