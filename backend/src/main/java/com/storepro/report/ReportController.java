package com.storepro.report;

import com.storepro.common.dto.ApiResponse;
import com.storepro.report.dto.OperatorStat;
import com.storepro.report.dto.ProductStat;
import com.storepro.report.dto.ReportSummaryData;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@Tag(name = "Relatórios", description = "Relatórios e estatísticas de vendas")
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/summary")
    @Operation(summary = "Resumo de vendas do período")
    public ResponseEntity<ApiResponse<ReportSummaryData>> getSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getSummary(resolveStart(startDate), resolveEnd(endDate))));
    }

    @GetMapping("/by-operator")
    @Operation(summary = "Vendas agrupadas por operador (caixa)")
    public ResponseEntity<ApiResponse<List<OperatorStat>>> getByOperator(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getByOperator(resolveStart(startDate), resolveEnd(endDate))));
    }

    @GetMapping("/top-products")
    @Operation(summary = "Produtos mais vendidos no período")
    public ResponseEntity<ApiResponse<List<ProductStat>>> getTopProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getTopProducts(resolveStart(startDate), resolveEnd(endDate), limit)));
    }

    private LocalDateTime resolveStart(LocalDateTime start) {
        return start != null ? start : LocalDate.now().withDayOfMonth(1).atStartOfDay();
    }

    private LocalDateTime resolveEnd(LocalDateTime end) {
        return end != null ? end : LocalDate.now().atTime(LocalTime.MAX);
    }
}
