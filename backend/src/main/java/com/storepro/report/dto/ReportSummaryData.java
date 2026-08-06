package com.storepro.report.dto;

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
public class ReportSummaryData {

    private BigDecimal totalRevenue;
    private long totalSales;
    private BigDecimal averageTicket;
    private BigDecimal totalDiscount;
    private long cancelledSales;
    private List<PaymentMethodStat> byPaymentMethod;
    private List<DailyStat> dailySales;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentMethodStat {
        private String method;
        private BigDecimal total;
        private long count;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyStat {
        private String date;
        private BigDecimal revenue;
        private long count;
    }
}
