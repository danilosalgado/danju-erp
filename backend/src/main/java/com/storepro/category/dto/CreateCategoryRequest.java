package com.storepro.category.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateCategoryRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 100, message = "Nome deve ter no máximo 100 caracteres")
    private String name;

    @Size(max = 500, message = "Descrição deve ter no máximo 500 caracteres")
    private String description;

    private UUID parentId;

    private Integer sortOrder;
}
