package com.storepro.purchase.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PurchaseResponse {
    private UUID id;
    private String supplierName;
    private LocalDate purchaseDate;
    private BigDecimal totalCost;
    private String notes;
    private String status;
    private List<ItemResponse> items;
    private LocalDateTime createdAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ItemResponse {
        private UUID id;
        private UUID productId;
        private String productName;
        private BigDecimal quantity;
        private BigDecimal unitCost;
        private BigDecimal totalCost;
    }
}
