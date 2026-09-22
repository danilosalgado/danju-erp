package com.storepro.report;

import com.storepro.report.dto.CmvReportData;
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
import java.util.Comparator;
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
                        .unit((String) row[4])
                        .build())
                .toList();
    }

    @Transactional(readOnly = true)
    public CmvReportData getCmv(LocalDateTime start, LocalDateTime end) {
        List<CmvReportData.ProductCmv> products = saleRepository.findCmvByProduct(start, end).stream()
                .map(row -> {
                    BigDecimal qty = (BigDecimal) row[3];
                    BigDecimal revenue = money((BigDecimal) row[4]);
                    BigDecimal cmv = money((BigDecimal) row[5]);
                    BigDecimal profit = revenue.subtract(cmv);
                    return CmvReportData.ProductCmv.builder()
                            .productId((UUID) row[0])
                            .productName((String) row[1])
                            .unit((String) row[2])
                            .quantitySold(qty)
                            .revenue(revenue)
                            .cmv(cmv)
                            .profit(profit)
                            .margin(percent(profit, revenue))
                            .averageUnitPrice(perUnit(revenue, qty))
                            .averageUnitCost(perUnit(cmv, qty))
                            .build();
                })
                .sorted(Comparator.comparing(CmvReportData.ProductCmv::getProfit).reversed())
                .toList();

        BigDecimal totalRevenue = products.stream().map(CmvReportData.ProductCmv::getRevenue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCmv = products.stream().map(CmvReportData.ProductCmv::getCmv)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalProfit = totalRevenue.subtract(totalCmv);

        return CmvReportData.builder()
                .totalRevenue(totalRevenue)
                .totalCmv(totalCmv)
                .totalProfit(totalProfit)
                .margin(percent(totalProfit, totalRevenue))
                .products(products)
                .build();
    }

    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal percent(BigDecimal part, BigDecimal whole) {
        return whole.signum() != 0
                ? part.multiply(BigDecimal.valueOf(100)).divide(whole, 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
    }

    private static BigDecimal perUnit(BigDecimal total, BigDecimal qty) {
        return qty.signum() != 0 ? total.divide(qty, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
    }
}
