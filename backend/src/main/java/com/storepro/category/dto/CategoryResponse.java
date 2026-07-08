package com.storepro.category.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CategoryResponse {

    private UUID id;
    private String name;
    private String description;
    private UUID parentId;
    private String parentName;
    private boolean active;
    private int sortOrder;
    private List<CategoryResponse> children;
    private LocalDateTime createdAt;
}
