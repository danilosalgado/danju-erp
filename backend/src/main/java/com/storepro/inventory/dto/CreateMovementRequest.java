package com.storepro.inventory.dto;

import com.storepro.inventory.entity.MovementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
public class CreateMovementRequest {

    @NotNull(message = "Produto é obrigatório")
    private UUID productId;

    @NotNull(message = "Tipo de movimentação é obrigatório")
    private MovementType type;

    @Min(value = 1, message = "Quantidade deve ser maior que zero")
    private int quantity;

    private BigDecimal unitCost;
    private String reason;
    private String lotNumber;
    private LocalDate expiryDate;
    private String serialNumber;
}
