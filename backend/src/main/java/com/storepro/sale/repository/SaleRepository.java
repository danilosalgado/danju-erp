package com.storepro.sale.repository;

import com.storepro.sale.entity.Sale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface SaleRepository extends JpaRepository<Sale, UUID> {

    @Query("SELECT s FROM Sale s WHERE " +
           "(:status IS NULL OR s.status = :status) " +
           "AND (:startDate IS NULL OR s.createdAt >= :startDate) " +
           "AND (:endDate IS NULL OR s.createdAt <= :endDate) " +
           "ORDER BY s.createdAt DESC")
    Page<Sale> findWithFilters(
            @Param("status") String status,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(s.total), 0) FROM Sale s WHERE s.status = 'FINALIZADA' " +
           "AND s.createdAt >= :start AND s.createdAt <= :end")
    BigDecimal sumTotalByPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.status = 'FINALIZADA' " +
           "AND s.createdAt >= :start AND s.createdAt <= :end")
    long countByPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT CAST(s.created_at AS DATE) as sale_date, " +
           "COALESCE(SUM(s.total), 0) as total_revenue, COUNT(s.id) as sale_count " +
           "FROM sales s WHERE s.status = 'FINALIZADA' " +
           "AND s.created_at >= :start AND s.created_at <= :end " +
           "GROUP BY CAST(s.created_at AS DATE) ORDER BY sale_date", nativeQuery = true)
    java.util.List<Object[]> findDailySales(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
