package com.storepro.terminal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Resultado que o app da maquininha devolve depois de rodar o PlugPag. */
@Data
public class TerminalResultRequest {

    /** APROVADO, RECUSADO ou CANCELADO. */
    @NotBlank(message = "Status é obrigatório")
    private String status;

    private String nsu;
    private String authorizationCode;
    private String transactionCode;
    private String cardBrand;
    private String cardLast4;
    private String receiptCustomer;
    private String receiptMerchant;
    private String errorCode;
    private String errorMessage;
}
