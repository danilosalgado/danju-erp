package com.storepro.customer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/** Cliente + histórico de compras, usado na ficha do CRM. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerSummaryResponse {

    private CustomerResponse customer;
    private long totalPurchases;
    private BigDecimal totalSpent;
    private BigDecimal averageTicket;
    private LocalDateTime lastPurchaseAt;
    private List<PurchaseEntry> recentPurchases;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PurchaseEntry {
        private UUID id;
        private Integer saleNumber;
        private LocalDateTime date;
        private BigDecimal total;
        private String status;
        private int itemCount;
    }
}
