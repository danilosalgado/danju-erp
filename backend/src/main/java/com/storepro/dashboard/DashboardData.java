package com.storepro.dashboard;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardData {

    private BigDecimal todayRevenue;
    private BigDecimal monthRevenue;
    private long todaySales;
    private long monthSales;
    private BigDecimal averageTicket;
    private long totalProducts;
    private long lowStockCount;
    private long outOfStockCount;
    private long totalCustomers;
    private List<TopProduct> topProducts;
    private List<LowStockProduct> criticalStock;
    private List<DailySale> dailySales;
    private BigDecimal previousMonthRevenue;
    private long previousMonthSales;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopProduct {
        private String name;
        private long quantitySold;
        private BigDecimal revenue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LowStockProduct {
        private String name;
        private String sku;
        private int currentStock;
        private int minStock;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailySale {
        private String date;
        private BigDecimal revenue;
        private long count;
    }
}
