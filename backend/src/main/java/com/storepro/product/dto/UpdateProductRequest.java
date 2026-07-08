package com.storepro.product.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class UpdateProductRequest {
    private String name;
    private String internalCode;
    private String sku;
    private String barcode;
    private String description;
    private UUID categoryId;
    private UUID supplierId;
    private String brand;
    private String unit;
    private BigDecimal costPrice;
    private BigDecimal salePrice;
    private BigDecimal weight;
    private BigDecimal width;
    private BigDecimal height;
    private BigDecimal depth;
    private Integer minStock;
    private Integer currentStock;
    private String stockLocation;
    private Boolean active;
}
