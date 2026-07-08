package com.storepro.auth.dto;

import com.storepro.user.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private UUID userId;
    private String name;
    private String email;
    private Role role;
}
