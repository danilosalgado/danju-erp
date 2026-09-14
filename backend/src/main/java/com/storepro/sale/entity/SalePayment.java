package com.storepro.sale.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "sale_payments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SalePayment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;

    @Column(nullable = false, length = 20)
    private String method; // DINHEIRO, PIX, DEBITO, CREDITO, VALE

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "change_amount", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal changeAmount = BigDecimal.ZERO;

    @Column
    @Builder.Default
    private int installments = 1;

    @Column(length = 100)
    private String reference;

    // Dados da transacao na maquininha, guardados para o comprovante e para
    // conciliar a venda com o extrato do PagBank.
    @Column(length = 50)
    private String nsu;

    @Column(name = "authorization_code", length = 50)
    private String authorizationCode;

    @Column(name = "card_brand", length = 30)
    private String cardBrand;

    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "terminal_payment_id")
    private com.storepro.terminal.entity.TerminalPayment terminalPayment;
}
