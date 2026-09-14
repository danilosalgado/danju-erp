package com.storepro.terminal.entity;

import com.storepro.common.entity.BaseEntity;
import com.storepro.sale.entity.Sale;
import com.storepro.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Ordem de cobrança enviada à maquininha.
 *
 * O PDV é uma tela web e não tem como acionar a Moderninha Smart diretamente —
 * o SDK do PagBank (PlugPag) só roda no Android da própria maquininha. Então o
 * fluxo é assíncrono: o PDV cria a ordem aqui como PENDENTE, o app instalado na
 * maquininha busca a próxima ordem do seu terminal, passa o cartão e devolve o
 * resultado. O PDV acompanha o status até APROVADO ou RECUSADO.
 */
@Entity
@Table(name = "terminal_payments")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerminalPayment extends BaseEntity {

    @Column(name = "terminal_id", nullable = false, length = 50)
    private String terminalId;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 20)
    private String method;

    @Column(nullable = false)
    @Builder.Default
    private int installments = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TerminalPaymentStatus status = TerminalPaymentStatus.PENDENTE;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String provider = "PAGBANK";

    @Column(length = 50)
    private String nsu;

    @Column(name = "authorization_code", length = 50)
    private String authorizationCode;

    @Column(name = "transaction_code", length = 100)
    private String transactionCode;

    @Column(name = "card_brand", length = 30)
    private String cardBrand;

    @Column(name = "card_last4", length = 4)
    private String cardLast4;

    @Column(name = "receipt_customer", columnDefinition = "TEXT")
    private String receiptCustomer;

    @Column(name = "receipt_merchant", columnDefinition = "TEXT")
    private String receiptMerchant;

    // --- PIX via API REST do PagBank (provider PAGBANK_API) ---

    @Column(name = "provider_order_id", length = 100)
    private String providerOrderId;

    @Column(name = "qr_code_id", length = 100)
    private String qrCodeId;

    /** Payload "copia e cola" do PIX. */
    @Column(name = "qr_code_text", columnDefinition = "TEXT")
    private String qrCodeText;

    @Column(name = "qr_code_image_url", length = 500)
    private String qrCodeImageUrl;

    @Column(name = "payer_tax_id", length = 20)
    private String payerTaxId;

    @Column(name = "error_code", length = 20)
    private String errorCode;

    @Column(name = "error_message", length = 255)
    private String errorMessage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "claimed_at")
    private LocalDateTime claimedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
