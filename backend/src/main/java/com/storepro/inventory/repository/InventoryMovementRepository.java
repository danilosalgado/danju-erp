package com.storepro.inventory.repository;

import com.storepro.inventory.entity.InventoryMovement;
import com.storepro.inventory.entity.MovementType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, UUID> {

    Page<InventoryMovement> findByProductIdOrderByCreatedAtDesc(UUID productId, Pageable pageable);

    @Query("SELECT m FROM InventoryMovement m WHERE " +
           "(:productId IS NULL OR m.product.id = :productId) " +
           "AND (:type IS NULL OR m.type = :type) " +
           "AND (:startDate IS NULL OR m.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR m.createdAt <= :endDate) " +
           "ORDER BY m.createdAt DESC")
    Page<InventoryMovement> findWithFilters(
            @Param("productId") UUID productId,
            @Param("type") MovementType type,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable
    );

    @Query("SELECT m FROM InventoryMovement m WHERE m.product.id = :productId " +
           "AND m.lotNumber = :lot ORDER BY m.createdAt DESC")
    List<InventoryMovement> findByProductAndLot(@Param("productId") UUID productId, @Param("lot") String lot);
}
