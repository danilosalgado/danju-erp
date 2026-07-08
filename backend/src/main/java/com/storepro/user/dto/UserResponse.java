package com.storepro.user.dto;

import com.storepro.user.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private UUID id;
    private String name;
    private String email;
    private String phone;
    private Role role;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
