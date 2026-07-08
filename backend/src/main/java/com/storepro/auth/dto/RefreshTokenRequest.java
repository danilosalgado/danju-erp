package com.storepro.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenRequest {

    @NotBlank(message = "Refresh token é obrigatório")
    private String refreshToken;
}
