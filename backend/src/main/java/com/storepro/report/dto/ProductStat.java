package com.storepro.report.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductStat {
    private UUID productId;
    private String productName;
    private BigDecimal quantitySold;
    private String unit;
    private BigDecimal revenue;
}
