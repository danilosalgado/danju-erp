package com.storepro.product.entity;

import com.storepro.category.entity.Category;
import com.storepro.common.entity.BaseEntity;
import com.storepro.supplier.entity.Supplier;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

@Entity
@Table(name = "products")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "internal_code", length = 50)
    private String internalCode;

    @Column(length = 50, unique = true)
    private String sku;

    @Column(length = 50)
    private String barcode;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @Column(length = 100)
    private String brand;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String unit = "UN";

    @Column(name = "cost_price", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "sale_price", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(name = "profit_margin", precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal profitMargin = BigDecimal.ZERO;

    @Column(precision = 8, scale = 3)
    private BigDecimal weight;

    @Column(precision = 8, scale = 2)
    private BigDecimal width;

    @Column(precision = 8, scale = 2)
    private BigDecimal height;

    @Column(precision = 8, scale = 2)
    private BigDecimal depth;

    @Column(name = "min_stock", nullable = false)
    @Builder.Default
    private int minStock = 0;

    @Column(name = "current_stock", nullable = false)
    @Builder.Default
    private int currentStock = 0;

    @Column(name = "stock_location", length = 100)
    private String stockLocation;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /**
     * Auto-calculate profit margin when costPrice and salePrice are set.
     */
    @PrePersist
    @PreUpdate
    public void calculateMargin() {
        if (costPrice != null && salePrice != null && costPrice.compareTo(BigDecimal.ZERO) > 0) {
            profitMargin = salePrice.subtract(costPrice)
                    .divide(costPrice, 4, java.math.RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(2, java.math.RoundingMode.HALF_UP);
        }
    }
}
