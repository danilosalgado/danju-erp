package com.storepro.expense.service;

import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.expense.dto.ExpenseRequest;
import com.storepro.expense.dto.ExpenseResponse;
import com.storepro.expense.entity.Expense;
import com.storepro.expense.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final ExpenseRepository expenseRepository;

    @Transactional
    public ExpenseResponse create(ExpenseRequest request) {
        Expense expense = Expense.builder()
                .description(request.getDescription())
                .category(request.getCategory())
                .amount(request.getAmount())
                .dueDate(request.getDueDate())
                .paidDate(request.getPaidDate())
                .paid(request.isPaid())
                .recurrence(request.getRecurrence() != null ? request.getRecurrence() : "UNICA")
                .notes(request.getNotes())
                .build();
        return toResponse(expenseRepository.save(expense));
    }

    @Transactional(readOnly = true)
    public ExpenseResponse getById(UUID id) {
        return toResponse(expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa", "id", id)));
    }

    @Transactional(readOnly = true)
    public PageResponse<ExpenseResponse> list(String category, Boolean paid,
                                               LocalDate startDate, LocalDate endDate,
                                               int page, int size) {
        Page<Expense> expensePage = expenseRepository.findWithFilters(
                category, paid, startDate, endDate, PageRequest.of(page, size));
        return PageResponse.of(
                expensePage.getContent().stream().map(this::toResponse).toList(),
                page, size, expensePage.getTotalElements());
    }

    @Transactional
    public ExpenseResponse update(UUID id, ExpenseRequest request) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa", "id", id));

        expense.setDescription(request.getDescription());
        expense.setCategory(request.getCategory());
        expense.setAmount(request.getAmount());
        expense.setDueDate(request.getDueDate());
        expense.setPaidDate(request.getPaidDate());
        expense.setPaid(request.isPaid());
        expense.setRecurrence(request.getRecurrence());
        expense.setNotes(request.getNotes());

        return toResponse(expenseRepository.save(expense));
    }

    @Transactional
    public ExpenseResponse markAsPaid(UUID id) {
        Expense expense = expenseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despesa", "id", id));
        expense.setPaid(true);
        expense.setPaidDate(LocalDate.now());
        return toResponse(expenseRepository.save(expense));
    }

    @Transactional
    public void delete(UUID id) {
        if (!expenseRepository.existsById(id)) {
            throw new ResourceNotFoundException("Despesa", "id", id);
        }
        expenseRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalExpenses(LocalDate startDate, LocalDate endDate) {
        return expenseRepository.sumByPeriod(startDate, endDate);
    }

    @Transactional(readOnly = true)
    public BigDecimal getTotalPaidExpenses(LocalDate startDate, LocalDate endDate) {
        return expenseRepository.sumPaidByPeriod(startDate, endDate);
    }

    private ExpenseResponse toResponse(Expense e) {
        return ExpenseResponse.builder()
                .id(e.getId())
                .description(e.getDescription())
                .category(e.getCategory())
                .amount(e.getAmount())
                .dueDate(e.getDueDate())
                .paidDate(e.getPaidDate())
                .paid(e.isPaid())
                .recurrence(e.getRecurrence())
                .notes(e.getNotes())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
