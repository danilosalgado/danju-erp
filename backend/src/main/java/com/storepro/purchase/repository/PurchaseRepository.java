package com.storepro.purchase.repository;

import com.storepro.purchase.entity.Purchase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.UUID;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, UUID> {

    @Query(value = "SELECT p.* FROM purchases p WHERE " +
           "(cast(:supplierId as uuid) IS NULL OR p.supplier_id = :supplierId) " +
           "AND (cast(:startDate as date) IS NULL OR p.purchase_date >= :startDate) " +
           "AND (cast(:endDate as date) IS NULL OR p.purchase_date <= :endDate) " +
           "ORDER BY p.purchase_date DESC",
           countQuery = "SELECT count(*) FROM purchases p WHERE " +
           "(cast(:supplierId as uuid) IS NULL OR p.supplier_id = :supplierId) " +
           "AND (cast(:startDate as date) IS NULL OR p.purchase_date >= :startDate) " +
           "AND (cast(:endDate as date) IS NULL OR p.purchase_date <= :endDate)",
           nativeQuery = true)
    Page<Purchase> findWithFilters(
            @Param("supplierId") UUID supplierId,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);
}
