package com.storepro.terminal.service;

import com.storepro.common.exception.BusinessException;
import com.storepro.terminal.config.TerminalProperties;
import com.storepro.terminal.dto.TerminalPaymentResponse;
import com.storepro.terminal.dto.TerminalResultRequest;
import com.storepro.terminal.dto.TerminalTaskResponse;
import com.storepro.terminal.entity.TerminalPayment;
import com.storepro.terminal.entity.TerminalPaymentStatus;
import com.storepro.terminal.repository.TerminalPaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Lado do app Android instalado na Moderninha Smart.
 *
 * Fica separado do TerminalPaymentService de propósito: o PIX não depende de
 * nada disto. Toda a conversa com a maquininha — pegar a próxima cobrança,
 * devolver o resultado, autenticar o terminal — vive aqui, e o resto do sistema
 * continua funcionando se esta integração nunca for ligada.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TerminalAgentService {

    private final TerminalPaymentRepository repository;
    private final TerminalPaymentService terminalPaymentService;
    private final TerminalProperties properties;

    /** Tipo equivalente no SDK PlugPag para cada forma de pagamento do PDV. */
    private static final Map<String, String> PLUGPAG_TYPES = Map.of(
            "CARTAO_CREDITO", "CREDITO",
            "CARTAO_DEBITO", "DEBITO",
            "PIX", "PIX",
            "VOUCHER", "VOUCHER"
    );

    private static final Set<String> RESULT_STATUSES = Set.of("APROVADO", "RECUSADO", "CANCELADO");

    /**
     * O app pergunta se há cobrança para ele e já assume a ordem na mesma chamada.
     * Assumir aqui (e não numa segunda chamada) evita que dois apps apontando para
     * o mesmo terminal passem o cartão duas vezes pela mesma venda.
     */
    @Transactional
    public Optional<TerminalTaskResponse> claimNext(String terminalId) {
        LocalDateTime now = LocalDateTime.now();
        List<TerminalPayment> pending = repository.findNextPending(terminalId, now, PageRequest.of(0, 1));
        if (pending.isEmpty()) return Optional.empty();

        TerminalPayment payment = pending.get(0);
        payment.setStatus(TerminalPaymentStatus.ENVIADO);
        payment.setClaimedAt(now);
        repository.save(payment);

        return Optional.of(TerminalTaskResponse.builder()
                .id(payment.getId())
                .amount(payment.getAmount())
                // O PlugPag recebe o valor em centavos; mandar reais cobraria
                // cem vezes menos do cliente.
                .amountCents(payment.getAmount().movePointRight(2).longValueExact())
                .method(payment.getMethod())
                .installments(payment.getInstallments())
                .plugPagType(PLUGPAG_TYPES.get(payment.getMethod()))
                .build());
    }

    @Transactional
    public TerminalPaymentResponse registerResult(UUID id, TerminalResultRequest result) {
        TerminalPayment payment = terminalPaymentService.findById(id);

        String status = result.getStatus().toUpperCase();
        if (!RESULT_STATUSES.contains(status)) {
            throw new BusinessException("Status inválido: " + result.getStatus(), HttpStatus.BAD_REQUEST);
        }
        // A transacao ja aconteceu no cartao do cliente; reescrever o resultado aqui
        // faria o ERP divergir do extrato do PagBank.
        if (payment.getStatus().isFinal()) {
            throw new BusinessException(
                    "Cobrança já finalizada como " + payment.getStatus(), HttpStatus.CONFLICT);
        }

        payment.setStatus(TerminalPaymentStatus.valueOf(status));
        payment.setNsu(result.getNsu());
        payment.setAuthorizationCode(result.getAuthorizationCode());
        payment.setTransactionCode(result.getTransactionCode());
        payment.setCardBrand(result.getCardBrand());
        payment.setCardLast4(result.getCardLast4());
        payment.setReceiptCustomer(result.getReceiptCustomer());
        payment.setReceiptMerchant(result.getReceiptMerchant());
        payment.setErrorCode(result.getErrorCode());
        payment.setErrorMessage(result.getErrorMessage());
        payment.setFinishedAt(LocalDateTime.now());

        log.info("Cobranca {} retornou {} (NSU {})", id, status, result.getNsu());
        return terminalPaymentService.toResponse(repository.save(payment));
    }

    /** O app não pertence a um usuário logado: autentica por segredo compartilhado. */
    public void assertAgentToken(String token) {
        if (!properties.isConfigured()) {
            throw new BusinessException("Integração com a maquininha desativada", HttpStatus.SERVICE_UNAVAILABLE);
        }
        if (token == null || !properties.getAgentToken().equals(token)) {
            throw new BusinessException("Terminal não autorizado", HttpStatus.UNAUTHORIZED);
        }
    }
}
