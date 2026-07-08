package com.storepro.category.service;

import com.storepro.category.dto.CategoryResponse;
import com.storepro.category.dto.CreateCategoryRequest;
import com.storepro.category.dto.UpdateCategoryRequest;
import com.storepro.category.entity.Category;
import com.storepro.category.repository.CategoryRepository;
import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional
    public CategoryResponse create(CreateCategoryRequest request) {
        Category parent = null;
        if (request.getParentId() != null) {
            parent = findEntityById(request.getParentId());
        }

        if (categoryRepository.existsByNameAndParentId(request.getName(), request.getParentId())) {
            throw new BusinessException("Já existe uma categoria com este nome neste nível", HttpStatus.CONFLICT);
        }

        Category category = Category.builder()
                .name(request.getName())
                .description(request.getDescription())
                .parent(parent)
                .sortOrder(request.getSortOrder() != null ? request.getSortOrder() : 0)
                .active(true)
                .build();

        return toResponse(categoryRepository.save(category), true);
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getTree() {
        List<Category> roots = categoryRepository.findByParentIsNullOrderBySortOrderAsc();
        return roots.stream().map(c -> toResponse(c, true)).toList();
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAll() {
        return categoryRepository.findAll().stream()
                .map(c -> toResponse(c, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse getById(UUID id) {
        return toResponse(findEntityById(id), true);
    }

    @Transactional
    public CategoryResponse update(UUID id, UpdateCategoryRequest request) {
        Category category = findEntityById(id);

        if (request.getName() != null) {
            category.setName(request.getName());
        }
        if (request.getDescription() != null) {
            category.setDescription(request.getDescription());
        }
        if (request.getParentId() != null) {
            if (request.getParentId().equals(id)) {
                throw new BusinessException("Uma categoria não pode ser pai de si mesma");
            }
            Category parent = findEntityById(request.getParentId());
            category.setParent(parent);
        }
        if (request.getSortOrder() != null) {
            category.setSortOrder(request.getSortOrder());
        }
        if (request.getActive() != null) {
            category.setActive(request.getActive());
        }

        return toResponse(categoryRepository.save(category), true);
    }

    @Transactional
    public void delete(UUID id) {
        Category category = findEntityById(id);
        category.setActive(false);
        // Also deactivate children
        deactivateChildren(category);
        categoryRepository.save(category);
    }

    private void deactivateChildren(Category category) {
        if (category.getChildren() != null) {
            for (Category child : category.getChildren()) {
                child.setActive(false);
                deactivateChildren(child);
                categoryRepository.save(child);
            }
        }
    }

    private Category findEntityById(UUID id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Categoria", "id", id));
    }

    private CategoryResponse toResponse(Category category, boolean includeChildren) {
        CategoryResponse.CategoryResponseBuilder builder = CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .parentId(category.getParent() != null ? category.getParent().getId() : null)
                .parentName(category.getParent() != null ? category.getParent().getName() : null)
                .active(category.isActive())
                .sortOrder(category.getSortOrder())
                .createdAt(category.getCreatedAt());

        if (includeChildren && category.getChildren() != null && !category.getChildren().isEmpty()) {
            builder.children(
                category.getChildren().stream()
                    .map(c -> toResponse(c, true))
                    .toList()
            );
        }

        return builder.build();
    }
}
