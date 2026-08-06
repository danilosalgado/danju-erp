package com.storepro.report;

import com.storepro.report.dto.OperatorStat;
import com.storepro.report.dto.ProductStat;
import com.storepro.report.dto.ReportSummaryData;
import com.storepro.sale.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final SaleRepository saleRepository;

    @Transactional(readOnly = true)
    public ReportSummaryData getSummary(LocalDateTime start, LocalDateTime end) {
        BigDecimal totalRevenue = saleRepository.sumTotalByPeriod(start, end);
        long totalSales = saleRepository.countByPeriod(start, end);
        BigDecimal totalDiscount = saleRepository.sumDiscountByPeriod(start, end);
        long cancelledSales = saleRepository.countCancelledByPeriod(start, end);

        BigDecimal avgTicket = totalSales > 0
                ? totalRevenue.divide(BigDecimal.valueOf(totalSales), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<ReportSummaryData.PaymentMethodStat> byPaymentMethod = saleRepository
                .findRevenueByPaymentMethod(start, end).stream()
                .map(row -> ReportSummaryData.PaymentMethodStat.builder()
                        .method((String) row[0])
                        .total((BigDecimal) row[1])
                        .count(((Number) row[2]).longValue())
                        .build())
                .toList();

        List<ReportSummaryData.DailyStat> dailySales = saleRepository
                .findDailySales(start, end).stream()
                .map(row -> ReportSummaryData.DailyStat.builder()
                        .date(row[0].toString())
                        .revenue((BigDecimal) row[1])
                        .count(((Number) row[2]).longValue())
                        .build())
                .toList();

        return ReportSummaryData.builder()
                .totalRevenue(totalRevenue)
                .totalSales(totalSales)
                .averageTicket(avgTicket)
                .totalDiscount(totalDiscount)
                .cancelledSales(cancelledSales)
                .byPaymentMethod(byPaymentMethod)
                .dailySales(dailySales)
                .build();
    }

    @Transactional(readOnly = true)
    public List<OperatorStat> getByOperator(LocalDateTime start, LocalDateTime end) {
        return saleRepository.findRevenueByOperator(start, end).stream()
                .map(row -> {
                    BigDecimal revenue = (BigDecimal) row[2];
                    long count = ((Number) row[3]).longValue();
                    BigDecimal avg = count > 0 ? revenue.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
                    return OperatorStat.builder()
                            .userId((UUID) row[0])
                            .userName((String) row[1])
                            .revenue(revenue)
                            .salesCount(count)
                            .averageTicket(avg)
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductStat> getTopProducts(LocalDateTime start, LocalDateTime end, int limit) {
        return saleRepository.findTopProducts(start, end, limit).stream()
                .map(row -> ProductStat.builder()
                        .productId((UUID) row[0])
                        .productName((String) row[1])
                        .quantitySold((BigDecimal) row[2])
                        .revenue((BigDecimal) row[3])
                        .build())
                .toList();
    }
}
