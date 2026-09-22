package com.storepro.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * CMV (Custo da Mercadoria Vendida): quanto custou comprar o que foi vendido
 * e o lucro de cada produto sobre esse custo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CmvReportData {

    private BigDecimal totalRevenue;
    private BigDecimal totalCmv;
    /** Faturamento - CMV. */
    private BigDecimal totalProfit;
    /** Lucro sobre o faturamento, em %. */
    private BigDecimal margin;
    private List<ProductCmv> products;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProductCmv {
        private UUID productId;
        private String productName;
        private String unit;
        private BigDecimal quantitySold;
        private BigDecimal revenue;
        private BigDecimal cmv;
        private BigDecimal profit;
        private BigDecimal margin;
        private BigDecimal averageUnitPrice;
        private BigDecimal averageUnitCost;
    }
}
