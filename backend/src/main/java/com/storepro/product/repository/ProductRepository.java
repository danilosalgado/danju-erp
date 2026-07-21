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

    @Query(value = "SELECT p.* FROM products p " +
           "LEFT JOIN categories c ON p.category_id = c.id " +
           "WHERE (:search IS NULL OR " +
           "  unaccent(lower(p.name)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "  OR lower(p.sku) LIKE '%' || lower(cast(:search as text)) || '%' " +
           "  OR p.barcode LIKE '%' || cast(:search as text) || '%') " +
           "AND (cast(:categoryId as uuid) IS NULL OR p.category_id = :categoryId) " +
           "AND (cast(:supplierId as uuid) IS NULL OR p.supplier_id = :supplierId) " +
           "AND (cast(:active as boolean) IS NULL OR p.active = :active) " +
           "ORDER BY p.name",
           countQuery = "SELECT count(*) FROM products p " +
           "WHERE (:search IS NULL OR " +
           "  unaccent(lower(p.name)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "  OR lower(p.sku) LIKE '%' || lower(cast(:search as text)) || '%' " +
           "  OR p.barcode LIKE '%' || cast(:search as text) || '%') " +
           "AND (cast(:categoryId as uuid) IS NULL OR p.category_id = :categoryId) " +
           "AND (cast(:supplierId as uuid) IS NULL OR p.supplier_id = :supplierId) " +
           "AND (cast(:active as boolean) IS NULL OR p.active = :active)",
           nativeQuery = true)
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
