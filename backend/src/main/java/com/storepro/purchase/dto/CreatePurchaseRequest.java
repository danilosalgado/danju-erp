package com.storepro.purchase.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class CreatePurchaseRequest {

    private UUID supplierId;

    private LocalDate purchaseDate;

    @NotEmpty(message = "A compra deve ter pelo menos um item")
    private List<PurchaseItemRequest> items;

    private String notes;

    @Data
    public static class PurchaseItemRequest {
        @NotNull(message = "Produto é obrigatório")
        private UUID productId;

        @NotNull(message = "Quantidade é obrigatória")
        private BigDecimal quantity;

        @NotNull(message = "Custo unitário é obrigatório")
        private BigDecimal unitCost;
    }
}
