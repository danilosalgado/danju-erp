package com.storepro.expense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ExpenseRequest {

    @NotBlank(message = "Descrição é obrigatória")
    private String description;

    @NotBlank(message = "Categoria é obrigatória")
    private String category;

    @NotNull(message = "Valor é obrigatório")
    @Positive(message = "Valor deve ser positivo")
    private BigDecimal amount;

    @NotNull(message = "Data de vencimento é obrigatória")
    private LocalDate dueDate;

    private LocalDate paidDate;
    private boolean paid;
    private String recurrence;
    private String notes;
}
