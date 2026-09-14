package com.storepro.terminal.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * O que o app da maquininha recebe para montar a chamada do PlugPag.
 * `amountCents` vai em centavos porque é assim que o SDK do PagBank espera o
 * valor — mandar reais aqui cobraria cem vezes mais do cliente.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerminalTaskResponse {

    private UUID id;
    private BigDecimal amount;
    private long amountCents;
    private String method;
    private int installments;
    /** Tipo PlugPag equivalente: CREDITO, DEBITO, PIX, VOUCHER. */
    private String plugPagType;
}
