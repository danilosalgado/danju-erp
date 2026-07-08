package com.storepro.inventory.dto;

import com.storepro.inventory.entity.MovementType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MovementResponse {
    private UUID id;
    private UUID productId;
    private String productName;
    private String productSku;
    private MovementType type;
    private int quantity;
    private int previousStock;
    private int newStock;
    private BigDecimal unitCost;
    private String reason;
    private String lotNumber;
    private LocalDate expiryDate;
    private String serialNumber;
    private String userName;
    private LocalDateTime createdAt;
}
