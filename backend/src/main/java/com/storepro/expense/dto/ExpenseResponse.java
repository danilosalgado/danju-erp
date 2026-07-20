package com.storepro.expense.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @Builder
public class ExpenseResponse {
    private UUID id;
    private String description;
    private String category;
    private BigDecimal amount;
    private LocalDate dueDate;
    private LocalDate paidDate;
    private boolean paid;
    private String recurrence;
    private String notes;
    private LocalDateTime createdAt;
}
