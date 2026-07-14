package com.storepro.sale.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SaleResponse {
    private UUID id;
    private Integer saleNumber;
    private String customerName;
    private String userName;
    private BigDecimal subtotal;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal discountAmount;
    private BigDecimal surcharge;
    private BigDecimal total;
    private String status;
    private String notes;
    private List<ItemResponse> items;
    private List<PaymentResponse> payments;
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
        private String unit;
        private BigDecimal unitPrice;
        private BigDecimal discount;
        private BigDecimal totalPrice;
        private boolean cancelled;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentResponse {
        private UUID id;
        private String method;
        private BigDecimal amount;
        private BigDecimal changeAmount;
        private int installments;
        private String reference;
    }
}
