package com.storepro.dashboard;

import com.storepro.customer.repository.CustomerRepository;
import com.storepro.product.entity.Product;
import com.storepro.product.repository.ProductRepository;
import com.storepro.sale.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public DashboardData getDashboard() {
        LocalDateTime todayStart = LocalDate.now().atStartOfDay();
        LocalDateTime todayEnd = LocalDate.now().atTime(LocalTime.MAX);
        LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();

        BigDecimal todayRevenue = saleRepository.sumTotalByPeriod(todayStart, todayEnd);
        BigDecimal monthRevenue = saleRepository.sumTotalByPeriod(monthStart, todayEnd);
        long todaySales = saleRepository.countByPeriod(todayStart, todayEnd);
        long monthSales = saleRepository.countByPeriod(monthStart, todayEnd);

        BigDecimal avgTicket = monthSales > 0
                ? monthRevenue.divide(BigDecimal.valueOf(monthSales), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        long totalProducts = productRepository.count();
        List<Product> lowStockProducts = productRepository.findLowStock();
        List<Product> outOfStockProducts = productRepository.findOutOfStock();
        long totalCustomers = customerRepository.count();

        List<DashboardData.LowStockProduct> criticalStock = lowStockProducts.stream()
                .limit(10)
                .map(p -> DashboardData.LowStockProduct.builder()
                        .name(p.getName())
                        .sku(p.getSku())
                        .currentStock(p.getCurrentStock())
                        .minStock(p.getMinStock())
                        .build())
                .toList();

        // Daily sales for last 30 days chart
        LocalDateTime thirtyDaysAgo = LocalDate.now().minusDays(30).atStartOfDay();
        List<Object[]> dailySalesRaw = saleRepository.findDailySales(thirtyDaysAgo, todayEnd);
        List<DashboardData.DailySale> dailySales = dailySalesRaw.stream()
                .map(row -> DashboardData.DailySale.builder()
                        .date(row[0].toString())
                        .revenue((BigDecimal) row[1])
                        .count(((Number) row[2]).longValue())
                        .build())
                .toList();

        // Previous month comparison
        LocalDateTime prevMonthStart = LocalDate.now().minusMonths(1).withDayOfMonth(1).atStartOfDay();
        LocalDateTime prevMonthEnd = LocalDate.now().withDayOfMonth(1).atStartOfDay().minusNanos(1);
        BigDecimal previousMonthRevenue = saleRepository.sumTotalByPeriod(prevMonthStart, prevMonthEnd);
        long previousMonthSales = saleRepository.countByPeriod(prevMonthStart, prevMonthEnd);

        return DashboardData.builder()
                .todayRevenue(todayRevenue)
                .monthRevenue(monthRevenue)
                .todaySales(todaySales)
                .monthSales(monthSales)
                .averageTicket(avgTicket)
                .totalProducts(totalProducts)
                .lowStockCount(lowStockProducts.size())
                .outOfStockCount(outOfStockProducts.size())
                .totalCustomers(totalCustomers)
                .criticalStock(criticalStock)
                .dailySales(dailySales)
                .previousMonthRevenue(previousMonthRevenue)
                .previousMonthSales(previousMonthSales)
                .build();
    }
}
