package com.storepro.expense.repository;

import com.storepro.expense.entity.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public interface ExpenseRepository extends JpaRepository<Expense, UUID> {

    @Query("SELECT e FROM Expense e WHERE " +
           "(cast(:category as text) IS NULL OR e.category = :category) AND " +
           "(cast(:paid as boolean) IS NULL OR e.paid = :paid) AND " +
           "(cast(:startDate as date) IS NULL OR e.dueDate >= :startDate) AND " +
           "(cast(:endDate as date) IS NULL OR e.dueDate <= :endDate) " +
           "ORDER BY e.dueDate DESC")
    Page<Expense> findWithFilters(
            @Param("category") String category,
            @Param("paid") Boolean paid,
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE " +
           "e.dueDate >= :startDate AND e.dueDate <= :endDate")
    BigDecimal sumByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM Expense e WHERE " +
           "e.paid = true AND e.dueDate >= :startDate AND e.dueDate <= :endDate")
    BigDecimal sumPaidByPeriod(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
