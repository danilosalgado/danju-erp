package com.storepro.terminal.dto;

import com.storepro.terminal.entity.TerminalPaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/** Estado da cobrança, consultado pelo PDV enquanto o cliente passa o cartão. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerminalPaymentResponse {

    private UUID id;
    private String terminalId;
    private BigDecimal amount;
    private String method;
    private int installments;
    private TerminalPaymentStatus status;
    private String nsu;
    private String authorizationCode;
    private String cardBrand;
    private String cardLast4;
    private String receiptCustomer;

    /** Preenchidos no PIX: o PDV mostra a imagem e o copia-e-cola. */
    private String provider;
    private String qrCodeText;
    private String qrCodeImageUrl;

    private String errorCode;
    private String errorMessage;
    private LocalDateTime expiresAt;
    private LocalDateTime finishedAt;
}
