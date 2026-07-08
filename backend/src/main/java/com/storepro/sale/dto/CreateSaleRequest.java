package com.storepro.sale.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class CreateSaleRequest {

    private UUID customerId;

    @NotEmpty(message = "A venda deve ter pelo menos um item")
    private List<SaleItemRequest> items;

    @NotEmpty(message = "A venda deve ter pelo menos um pagamento")
    private List<SalePaymentRequest> payments;

    private String discountType; // PERCENTUAL, FIXO
    private BigDecimal discountValue;
    private BigDecimal surcharge;
    private String notes;

    @Data
    public static class SaleItemRequest {
        @NotNull(message = "Produto é obrigatório")
        private UUID productId;

        @Min(value = 1, message = "Quantidade deve ser maior que zero")
        private int quantity;

        private BigDecimal discount;
    }

    @Data
    public static class SalePaymentRequest {
        @NotNull(message = "Método de pagamento é obrigatório")
        private String method;

        @NotNull(message = "Valor é obrigatório")
        private BigDecimal amount;

        private int installments;
        private String reference;
    }
}
