package com.storepro.product.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private UUID id;
    private String name;
    private String internalCode;
    private String sku;
    private String barcode;
    private String description;
    private UUID categoryId;
    private String categoryName;
    private UUID supplierId;
    private String supplierName;
    private String brand;
    private String unit;
    private BigDecimal costPrice;
    private BigDecimal salePrice;
    private BigDecimal profitMargin;
    private BigDecimal weight;
    private BigDecimal width;
    private BigDecimal height;
    private BigDecimal depth;
    private int minStock;
    private int currentStock;
    private String stockLocation;
    private boolean active;
    private boolean lowStock;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
