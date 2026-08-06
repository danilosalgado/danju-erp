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
           "(cast(:status as text) IS NULL OR s.status = :status) " +
           "AND (cast(:startDate as timestamp) IS NULL OR s.createdAt >= :startDate) " +
           "AND (cast(:endDate as timestamp) IS NULL OR s.createdAt <= :endDate) " +
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

    @Query("SELECT COALESCE(SUM(s.discountAmount), 0) FROM Sale s WHERE s.status = 'FINALIZADA' " +
           "AND s.createdAt >= :start AND s.createdAt <= :end")
    BigDecimal sumDiscountByPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.status = 'CANCELADA' " +
           "AND s.createdAt >= :start AND s.createdAt <= :end")
    long countCancelledByPeriod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT u.id, u.name, COALESCE(SUM(s.total), 0) as revenue, COUNT(s.id) as sale_count " +
           "FROM sales s JOIN users u ON u.id = s.user_id " +
           "WHERE s.status = 'FINALIZADA' AND s.created_at >= :start AND s.created_at <= :end " +
           "GROUP BY u.id, u.name ORDER BY revenue DESC", nativeQuery = true)
    java.util.List<Object[]> findRevenueByOperator(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT sp.method, COALESCE(SUM(sp.amount), 0) as total, COUNT(DISTINCT sp.sale_id) as cnt " +
           "FROM sale_payments sp JOIN sales s ON s.id = sp.sale_id " +
           "WHERE s.status = 'FINALIZADA' AND s.created_at >= :start AND s.created_at <= :end " +
           "GROUP BY sp.method ORDER BY total DESC", nativeQuery = true)
    java.util.List<Object[]> findRevenueByPaymentMethod(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query(value = "SELECT si.product_id, si.product_name, COALESCE(SUM(si.quantity), 0) as qty, " +
           "COALESCE(SUM(si.total_price), 0) as revenue " +
           "FROM sale_items si JOIN sales s ON s.id = si.sale_id " +
           "WHERE s.status = 'FINALIZADA' AND si.cancelled = false " +
           "AND s.created_at >= :start AND s.created_at <= :end " +
           "GROUP BY si.product_id, si.product_name ORDER BY revenue DESC LIMIT :limit", nativeQuery = true)
    java.util.List<Object[]> findTopProducts(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end, @Param("limit") int limit);
}
