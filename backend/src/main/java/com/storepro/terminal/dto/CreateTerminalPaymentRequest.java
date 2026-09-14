package com.storepro.terminal.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

/** O PDV pede uma cobrança na maquininha. */
@Data
public class CreateTerminalPaymentRequest {

    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    private BigDecimal amount;

    /** CARTAO_CREDITO, CARTAO_DEBITO, PIX ou VOUCHER. */
    @NotBlank(message = "Método de pagamento é obrigatório")
    private String method;

    private Integer installments;

    /** Qual maquininha deve cobrar. Se vazio, usa o terminal padrão da configuração. */
    private String terminalId;

    /**
     * Cliente da venda, quando houver. No PIX o CPF dele vai como pagador —
     * sem cliente, cai no documento da loja.
     */
    private java.util.UUID customerId;

    /**
     * "CPF na nota": documento que o cliente informou no balcão, quando informou.
     * Tem prioridade sobre o cadastro e sobre o documento da loja.
     */
    private String payerTaxId;
}
