package com.storepro.audit.repository;

import com.storepro.audit.entity.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    @Query("SELECT a FROM AuditLog a WHERE " +
           "(:entityType IS NULL OR a.entityType = :entityType) " +
           "AND (:operation IS NULL OR a.operation = :operation) " +
           "AND (:userId IS NULL OR a.userId = :userId) " +
           "AND (:startDate IS NULL OR a.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR a.createdAt <= :endDate) " +
           "ORDER BY a.createdAt DESC")
    Page<AuditLog> findWithFilters(
            @Param("entityType") String entityType,
            @Param("operation") String operation,
            @Param("userId") UUID userId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);
}
