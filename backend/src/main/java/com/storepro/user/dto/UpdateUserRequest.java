package com.storepro.user.dto;

import com.storepro.user.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserRequest {

    @Size(min = 3, max = 150, message = "Nome deve ter entre 3 e 150 caracteres")
    private String name;

    @Email(message = "E-mail inválido")
    private String email;

    @Size(min = 6, max = 100, message = "Senha deve ter entre 6 e 100 caracteres")
    private String password;

    private String phone;

    private Role role;

    private Boolean active;
}
