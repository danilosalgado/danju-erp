package com.storepro.category.repository;

import com.storepro.category.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CategoryRepository extends JpaRepository<Category, UUID> {

    List<Category> findByParentIsNullOrderBySortOrderAsc();

    List<Category> findByParentIdOrderBySortOrderAsc(UUID parentId);

    @Query("SELECT c FROM Category c WHERE c.active = true AND c.parent IS NULL ORDER BY c.sortOrder")
    List<Category> findActiveRoots();

    List<Category> findByActiveOrderByNameAsc(boolean active);

    boolean existsByNameAndParentId(String name, UUID parentId);
}
