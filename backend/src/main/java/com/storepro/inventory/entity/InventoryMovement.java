package com.storepro.inventory.entity;

import com.storepro.common.entity.BaseEntity;
import com.storepro.product.entity.Product;
import com.storepro.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "inventory_movements")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryMovement extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MovementType type;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "previous_stock")
    private int previousStock;

    @Column(name = "new_stock")
    private int newStock;

    @Column(name = "unit_cost", precision = 12, scale = 2)
    private BigDecimal unitCost;

    @Column(length = 500)
    private String reason;

    @Column(name = "lot_number", length = 50)
    private String lotNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(name = "reference_type", length = 30)
    private String referenceType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
}
