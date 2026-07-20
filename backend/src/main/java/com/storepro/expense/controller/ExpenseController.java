package com.storepro.expense.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import com.storepro.expense.dto.ExpenseRequest;
import com.storepro.expense.dto.ExpenseResponse;
import com.storepro.expense.service.ExpenseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/expenses")
@RequiredArgsConstructor
@Tag(name = "Despesas", description = "Gerenciamento de despesas do negócio")
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Cadastrar despesa")
    public ResponseEntity<ApiResponse<ExpenseResponse>> create(@Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Despesa cadastrada", expenseService.create(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar despesa por ID")
    public ResponseEntity<ApiResponse<ExpenseResponse>> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(expenseService.getById(id)));
    }

    @GetMapping
    @Operation(summary = "Listar despesas com filtros")
    public ResponseEntity<ApiResponse<PageResponse<ExpenseResponse>>> list(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) Boolean paid,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                expenseService.list(category, paid, startDate, endDate, page, size)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Atualizar despesa")
    public ResponseEntity<ApiResponse<ExpenseResponse>> update(
            @PathVariable UUID id, @Valid @RequestBody ExpenseRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Despesa atualizada", expenseService.update(id, request)));
    }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Marcar despesa como paga")
    public ResponseEntity<ApiResponse<ExpenseResponse>> markAsPaid(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Despesa marcada como paga", expenseService.markAsPaid(id)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE')")
    @Operation(summary = "Excluir despesa")
    public ResponseEntity<ApiResponse<Void>> delete(@PathVariable UUID id) {
        expenseService.delete(id);
        return ResponseEntity.ok(ApiResponse.success("Despesa excluída", null));
    }

    @GetMapping("/summary")
    @Operation(summary = "Resumo financeiro do mês")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> summary(
            @RequestParam int month, @RequestParam int year) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        BigDecimal totalExpenses = expenseService.getTotalExpenses(start, end);
        BigDecimal totalPaid = expenseService.getTotalPaidExpenses(start, end);
        BigDecimal totalPending = totalExpenses.subtract(totalPaid);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "totalExpenses", totalExpenses,
                "totalPaid", totalPaid,
                "totalPending", totalPending
        )));
    }
}
