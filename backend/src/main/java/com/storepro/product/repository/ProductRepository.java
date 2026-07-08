package com.storepro.product.repository;

import com.storepro.product.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProductRepository extends JpaRepository<Product, UUID>, JpaSpecificationExecutor<Product> {

    Optional<Product> findBySku(String sku);

    Optional<Product> findByBarcode(String barcode);

    boolean existsBySku(String sku);

    @Query("SELECT p FROM Product p WHERE " +
           "(:search IS NULL OR LOWER(p.name) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR LOWER(p.sku) LIKE LOWER(CONCAT('%', :search, '%')) " +
           "OR p.barcode LIKE CONCAT('%', :search, '%')) " +
           "AND (:categoryId IS NULL OR p.category.id = :categoryId) " +
           "AND (:supplierId IS NULL OR p.supplier.id = :supplierId) " +
           "AND (:active IS NULL OR p.active = :active)")
    Page<Product> findWithFilters(
            @Param("search") String search,
            @Param("categoryId") UUID categoryId,
            @Param("supplierId") UUID supplierId,
            @Param("active") Boolean active,
            Pageable pageable
    );

    @Query("SELECT p FROM Product p WHERE p.active = true AND p.currentStock <= p.minStock")
    List<Product> findLowStock();

    @Query("SELECT p FROM Product p WHERE p.active = true AND p.currentStock = 0")
    List<Product> findOutOfStock();
}
