package com.storepro.terminal.service;

import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.customer.entity.Customer;
import com.storepro.customer.repository.CustomerRepository;
import com.storepro.pagbank.client.PagBankClient;
import com.storepro.pagbank.client.TaxIdValidator;
import com.storepro.pagbank.config.PagBankProperties;
import com.storepro.pagbank.dto.PagBankOrder;
import com.storepro.terminal.config.TerminalProperties;
import com.storepro.terminal.dto.CreateTerminalPaymentRequest;
import com.storepro.terminal.dto.TerminalPaymentResponse;
import com.storepro.terminal.entity.TerminalPayment;
import com.storepro.terminal.entity.TerminalPaymentStatus;
import com.storepro.terminal.repository.TerminalPaymentRepository;
import com.storepro.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

/**
 * Pagamentos que o PDV não fecha sozinho — ele pede a cobrança e espera confirmação.
 *
 * São dois caminhos bem diferentes atrás da mesma tela:
 *   PAGBANK      cartão na maquininha. Vira uma fila que o app Android consome.
 *   PAGBANK_API  PIX. O ERP chama a API do PagBank e recebe o QR Code na hora.
 *
 * O PDV não precisa saber a diferença: nos dois casos ele cria a cobrança e
 * consulta o status até virar APROVADO.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TerminalPaymentService {

    private final TerminalPaymentRepository repository;
    private final TerminalProperties properties;
    private final PagBankProperties pagBankProperties;
    private final PagBankClient pagBankClient;
    private final CustomerRepository customerRepository;

    private static final String PROVIDER_TERMINAL = "PAGBANK";
    private static final String PROVIDER_API = "PAGBANK_API";

    /** Formas que podem ser cobradas sem digitacao. Dinheiro nunca passa por aqui. */
    private static final Set<String> AUTO_METHODS =
            Set.of("CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "VOUCHER");

    // ---------------------------------------------------------------- PDV

    @Transactional
    public TerminalPaymentResponse create(CreateTerminalPaymentRequest request) {
        String method = request.getMethod().toUpperCase();
        if (!AUTO_METHODS.contains(method)) {
            throw new BusinessException(
                    "Forma de pagamento '" + method + "' não pode ser cobrada automaticamente",
                    HttpStatus.BAD_REQUEST);
        }

        BigDecimal amount = request.getAmount().setScale(2, RoundingMode.HALF_UP);

        // PIX tem caminho proprio pela API; so cai na maquininha se a API nao
        // estiver configurada e a maquininha estiver.
        if ("PIX".equals(method) && pagBankProperties.isConfigured()) {
            return createPixOrder(request, amount);
        }
        return createTerminalQueueItem(request, method, amount);
    }

    private TerminalPaymentResponse createPixOrder(CreateTerminalPaymentRequest request, BigDecimal amount) {
        Customer customer = request.getCustomerId() != null
                ? customerRepository.findById(request.getCustomerId()).orElse(null)
                : null;

        String payerTaxId = resolvePayerTaxId(request.getPayerTaxId(), customer);
        String payerName = customer != null ? customer.getName() : pagBankProperties.getFallbackCustomerName();
        String payerEmail = customer != null && customer.getEmail() != null
                ? customer.getEmail()
                : pagBankProperties.getFallbackCustomerEmail();

        TerminalPayment payment = TerminalPayment.builder()
                .terminalId(properties.getDefaultTerminalId())
                .amount(amount)
                .method("PIX")
                .installments(1)
                .status(TerminalPaymentStatus.PENDENTE)
                .provider(PROVIDER_API)
                .payerTaxId(payerTaxId)
                .user(currentUserOrNull())
                // O prazo aqui e o do QR Code, nao o da maquininha: o cliente
                // precisa de minutos para abrir o app do banco, nao de segundos.
                .expiresAt(LocalDateTime.now().plusMinutes(pagBankProperties.getQrExpirationMinutes()))
                .build();

        // Grava antes de chamar o PagBank para ter um id nosso como reference_id:
        // e por ele que a gente reencontra a cobranca no webhook e na conciliacao.
        TerminalPayment saved = repository.save(payment);

        PagBankOrder.Response order = pagBankClient.createPixOrder(
                saved.getId().toString(), amount, payerName, payerEmail, payerTaxId);

        if (order == null || order.qr_codes() == null || order.qr_codes().isEmpty()) {
            saved.setStatus(TerminalPaymentStatus.RECUSADO);
            saved.setErrorMessage("PagBank não devolveu o QR Code");
            saved.setFinishedAt(LocalDateTime.now());
            repository.save(saved);
            throw new BusinessException("PagBank não devolveu o QR Code", HttpStatus.BAD_GATEWAY);
        }

        PagBankOrder.QrCodeResponse qr = order.qr_codes().get(0);
        saved.setProviderOrderId(order.id());
        saved.setQrCodeId(qr.id());
        saved.setQrCodeText(qr.text());
        saved.setQrCodeImageUrl(qr.pngUrl());

        log.info("QR Code PIX de R$ {} gerado (pedido {})", amount, order.id());
        return toResponse(repository.save(saved));
    }

    private TerminalPaymentResponse createTerminalQueueItem(CreateTerminalPaymentRequest request,
                                                            String method, BigDecimal amount) {
        if (!properties.isConfigured()) {
            throw new BusinessException(
                    "PIX".equals(method)
                            ? "PIX automático não está configurado"
                            : "Integração com a maquininha não está configurada",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }

        String terminalId = request.getTerminalId() != null && !request.getTerminalId().isBlank()
                ? request.getTerminalId().trim()
                : properties.getDefaultTerminalId();

        int installments = request.getInstallments() != null && request.getInstallments() > 0
                ? request.getInstallments() : 1;
        if (installments > 1 && !"CARTAO_CREDITO".equals(method)) {
            throw new BusinessException("Parcelamento só existe no crédito", HttpStatus.BAD_REQUEST);
        }

        TerminalPayment payment = TerminalPayment.builder()
                .terminalId(terminalId)
                .amount(amount)
                .method(method)
                .installments(installments)
                .status(TerminalPaymentStatus.PENDENTE)
                .provider(PROVIDER_TERMINAL)
                .user(currentUserOrNull())
                .expiresAt(LocalDateTime.now().plusSeconds(properties.getTimeoutSeconds()))
                .build();

        TerminalPayment saved = repository.save(payment);
        log.info("Cobranca {} de R$ {} enviada para a maquininha {}",
                saved.getId(), saved.getAmount(), terminalId);
        return toResponse(saved);
    }

    /**
     * O PagBank recusa a cobrança sem CPF/CNPJ válido — testado, ele confere o
     * dígito verificador. A ordem reproduz o balcão:
     *   1. o "CPF na nota" que o cliente acabou de informar;
     *   2. o documento do cliente, se a venda tem um cadastrado;
     *   3. o documento da loja, para a venda anônima seguir sem travar o caixa.
     */
    private String resolvePayerTaxId(String informedTaxId, Customer customer) {
        if (informedTaxId != null && !informedTaxId.isBlank()) {
            // Digitado errado nao pode cair calado no documento da loja: o cliente
            // pediu a nota no CPF dele e ficaria sem.
            if (!TaxIdValidator.isValid(informedTaxId)) {
                throw new BusinessException("CPF/CNPJ informado é inválido", HttpStatus.BAD_REQUEST);
            }
            return TaxIdValidator.digitsOnly(informedTaxId);
        }
        if (customer != null && TaxIdValidator.isValid(customer.getCpfCnpj())) {
            return TaxIdValidator.digitsOnly(customer.getCpfCnpj());
        }
        String fallback = pagBankProperties.getFallbackTaxId();
        if (!TaxIdValidator.isValid(fallback)) {
            throw new BusinessException(
                    "Documento da loja (PAGBANK_FALLBACK_TAX_ID) é inválido — o PagBank recusaria a cobrança",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }
        return TaxIdValidator.digitsOnly(fallback);
    }

    @Transactional
    public TerminalPaymentResponse getStatus(UUID id) {
        TerminalPayment payment = findById(id);

        // Consulta o PagBank antes de olhar o relogio: um PIX pago no ultimo
        // segundo do QR nao pode virar EXPIRADO com o dinheiro ja na conta.
        refreshFromPagBank(payment);

        if (!payment.getStatus().isFinal() && payment.getExpiresAt().isBefore(LocalDateTime.now())) {
            payment.setStatus(TerminalPaymentStatus.EXPIRADO);
            payment.setFinishedAt(LocalDateTime.now());
            payment.setErrorMessage("PIX".equals(payment.getMethod())
                    ? "QR Code expirou sem pagamento"
                    : "Tempo esgotado sem resposta da maquininha");
            repository.save(payment);
        }
        return toResponse(payment);
    }

    /** Puxa o estado real do pedido no PagBank. Só se aplica ao caminho do PIX. */
    private void refreshFromPagBank(TerminalPayment payment) {
        if (!PROVIDER_API.equals(payment.getProvider())
                || payment.getStatus().isFinal()
                || payment.getProviderOrderId() == null) {
            return;
        }

        PagBankOrder.Response order;
        try {
            order = pagBankClient.getOrder(payment.getProviderOrderId());
        } catch (RuntimeException e) {
            // Instabilidade do PagBank nao pode derrubar a tela do caixa: o PDV
            // continua consultando e a proxima tentativa resolve.
            log.warn("Falha ao consultar o pedido {} no PagBank: {}",
                    payment.getProviderOrderId(), e.getMessage());
            return;
        }

        // Pedido sem charges = ninguem pagou ainda.
        if (order == null || order.charges() == null || order.charges().isEmpty()) return;

        PagBankOrder.Charge charge = order.charges().get(0);
        String status = charge.status() != null ? charge.status().toUpperCase() : "";

        if ("PAID".equals(status)) {
            applyPaid(payment, charge);
        } else if ("DECLINED".equals(status) || "CANCELED".equals(status) || "CANCELLED".equals(status)) {
            payment.setStatus(TerminalPaymentStatus.RECUSADO);
            payment.setFinishedAt(LocalDateTime.now());
            payment.setErrorMessage(charge.payment_response() != null
                    ? charge.payment_response().message() : "Pagamento não concluído");
            repository.save(payment);
        }
    }

    private void applyPaid(TerminalPayment payment, PagBankOrder.Charge charge) {
        payment.setStatus(TerminalPaymentStatus.APROVADO);
        payment.setFinishedAt(LocalDateTime.now());
        payment.setTransactionCode(charge.id());
        if (charge.payment_response() != null) {
            payment.setNsu(charge.payment_response().reference());
            payment.setAuthorizationCode(charge.payment_response().code());
        }
        if (payment.getNsu() == null) payment.setNsu(charge.id());
        repository.save(payment);
        log.info("PIX de R$ {} confirmado pelo PagBank (charge {})", payment.getAmount(), charge.id());
    }

    /** Chamado pelo webhook do PagBank quando o pagamento muda de estado. */
    @Transactional
    public void handleWebhook(String providerOrderId) {
        repository.findByProviderOrderId(providerOrderId).ifPresentOrElse(
                payment -> {
                    refreshFromPagBank(payment);
                    log.info("Webhook do pedido {} processado: status {}", providerOrderId, payment.getStatus());
                },
                () -> log.warn("Webhook de pedido desconhecido: {}", providerOrderId));
    }

    /** Operador desistiu no PDV. */
    @Transactional
    public TerminalPaymentResponse cancel(UUID id) {
        TerminalPayment payment = findById(id);
        if (payment.getStatus().isFinal()) {
            throw new BusinessException(
                    "Cobrança já finalizada como " + payment.getStatus(), HttpStatus.CONFLICT);
        }
        payment.setStatus(TerminalPaymentStatus.CANCELADO);
        payment.setFinishedAt(LocalDateTime.now());
        payment.setErrorMessage("Cancelada no PDV");
        return toResponse(repository.save(payment));
    }

    // ---------------------------------------------------------------- Interno

    /**
     * Usada pelo SaleService para provar que o pagamento informado foi mesmo
     * aprovado, e que ninguém está reaproveitando a mesma autorização em duas
     * vendas diferentes.
     *
     * @param saleId venda que está reivindicando a cobrança — null quando a venda
     *               ainda vai ser criada. Na edição de uma venda já salva, a
     *               cobrança dela mesma continua valendo.
     */
    @Transactional(readOnly = true)
    public TerminalPayment requireApproved(UUID id, BigDecimal amount, UUID saleId) {
        TerminalPayment payment = findById(id);
        if (payment.getStatus() != TerminalPaymentStatus.APROVADO) {
            throw new BusinessException(
                    "Cobrança não foi aprovada (" + payment.getStatus() + ")",
                    HttpStatus.BAD_REQUEST);
        }
        if (payment.getSale() != null
                && (saleId == null || !payment.getSale().getId().equals(saleId))) {
            throw new BusinessException(
                    "Esta cobrança já foi usada em outra venda", HttpStatus.CONFLICT);
        }
        if (amount != null && payment.getAmount().compareTo(amount.setScale(2, RoundingMode.HALF_UP)) != 0) {
            throw new BusinessException(
                    String.format("Valor cobrado (R$ %s) não confere com o pagamento (R$ %s)",
                            payment.getAmount(), amount.setScale(2, RoundingMode.HALF_UP)),
                    HttpStatus.BAD_REQUEST);
        }
        return payment;
    }

    /** Amarra a cobrança à venda depois que ela existe, fechando-a para reuso. */
    @Transactional
    public void linkToSale(TerminalPayment payment, com.storepro.sale.entity.Sale sale) {
        payment.setSale(sale);
        repository.save(payment);
    }

    /** Rede de segurança para ordens que ninguém mais consulta. */
    @Scheduled(fixedDelay = 60_000)
    @Transactional
    public void expireStale() {
        int expired = repository.expireStale(LocalDateTime.now());
        if (expired > 0) log.info("{} cobrancas expiradas por falta de resposta", expired);
    }

    public boolean isCardEnabled() {
        return properties.isConfigured();
    }

    public boolean isPixEnabled() {
        return pagBankProperties.isConfigured();
    }

    public String getDefaultTerminalId() {
        return properties.getDefaultTerminalId();
    }

    TerminalPayment findById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cobrança", "id", id));
    }

    private User currentUserOrNull() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.getPrincipal() instanceof User user) ? user : null;
    }

    TerminalPaymentResponse toResponse(TerminalPayment p) {
        return TerminalPaymentResponse.builder()
                .id(p.getId())
                .terminalId(p.getTerminalId())
                .amount(p.getAmount())
                .method(p.getMethod())
                .installments(p.getInstallments())
                .status(p.getStatus())
                .nsu(p.getNsu())
                .authorizationCode(p.getAuthorizationCode())
                .cardBrand(p.getCardBrand())
                .cardLast4(p.getCardLast4())
                .receiptCustomer(p.getReceiptCustomer())
                .provider(p.getProvider())
                .qrCodeText(p.getQrCodeText())
                .qrCodeImageUrl(p.getQrCodeImageUrl())
                .errorCode(p.getErrorCode())
                .errorMessage(p.getErrorMessage())
                .expiresAt(p.getExpiresAt())
                .finishedAt(p.getFinishedAt())
                .build();
    }
}
