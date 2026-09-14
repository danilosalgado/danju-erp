package com.storepro.pagbank.client;

import com.storepro.common.exception.BusinessException;
import com.storepro.pagbank.config.PagBankProperties;
import com.storepro.pagbank.dto.PagBankOrder;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/** Chamadas à API REST do PagBank. */
@Slf4j
@Component
@RequiredArgsConstructor
public class PagBankClient {

    private final PagBankProperties properties;
    private RestClient restClient;

    @PostConstruct
    void init() {
        if (!properties.isEnabled()) {
            log.info("PagBank PIX desativado (app.pagbank.enabled=false)");
            return;
        }
        // Falhar aqui, na subida, e melhor do que descobrir no balco com o cliente
        // esperando: sem documento valido o PagBank recusa TODA cobranca PIX.
        if (properties.getFallbackTaxId() != null
                && !TaxIdValidator.isValid(properties.getFallbackTaxId())) {
            log.error("PAGBANK_FALLBACK_TAX_ID invalido: o digito verificador nao confere. "
                    + "O PIX vai recusar toda cobranca de venda sem cliente cadastrado.");
        }
        if (properties.isConfigured()) {
            log.info("PagBank PIX ativo no ambiente {} ({})", properties.getEnv(), properties.getBaseUrl());
        } else {
            log.warn("PagBank PIX habilitado mas incompleto: falta token ou documento da loja");
        }

        this.restClient = RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .defaultHeader("Authorization", "Bearer " + properties.getToken())
                .defaultHeader("accept", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Cria o pedido com QR Code de PIX.
     *
     * @param taxId CPF/CNPJ do pagador, já validado pelo chamador.
     */
    public PagBankOrder.Response createPixOrder(String referenceId, BigDecimal amount,
                                                String customerName, String customerEmail, String taxId) {
        long cents = amount.movePointRight(2).longValueExact();

        String expiration = OffsetDateTime.now()
                .plusMinutes(properties.getQrExpirationMinutes())
                .withNano(0)
                .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);

        PagBankOrder.Request request = new PagBankOrder.Request(
                referenceId,
                new PagBankOrder.Customer(customerName, customerEmail, TaxIdValidator.digitsOnly(taxId)),
                List.of(new PagBankOrder.Item("Venda DanJu", 1, cents)),
                // "PAGBANK" em arrangements e obrigatorio para o QR aceitar pagamento.
                List.of(new PagBankOrder.QrCodeRequest(
                        new PagBankOrder.Amount(cents), expiration, List.of("PAGBANK"))),
                notificationUrls());

        return post("/orders", request);
    }

    public PagBankOrder.Response getOrder(String orderId) {
        try {
            return restClient().get().uri("/orders/{id}", orderId).retrieve()
                    .body(PagBankOrder.Response.class);
        } catch (RestClientResponseException e) {
            log.warn("PagBank respondeu {} ao consultar o pedido {}", e.getStatusCode(), orderId);
            throw new BusinessException("Não foi possível consultar o pagamento no PagBank",
                    HttpStatus.BAD_GATEWAY);
        }
    }

    private PagBankOrder.Response post(String uri, Object body) {
        try {
            PagBankOrder.Response response = restClient().post().uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(PagBankOrder.Response.class);

            if (response != null && response.error_messages() != null && !response.error_messages().isEmpty()) {
                throw new BusinessException("PagBank recusou: " + describe(response.error_messages()),
                        HttpStatus.BAD_REQUEST);
            }
            return response;
        } catch (RestClientResponseException e) {
            // O corpo do erro do PagBank diz qual campo reprovou; sem ele o caixa
            // so veria "erro 400" e nao teria o que corrigir.
            String detail = e.getResponseBodyAsString();
            log.warn("PagBank respondeu {} em {}: {}", e.getStatusCode(), uri, detail);
            throw new BusinessException("PagBank recusou a cobrança: " + shorten(detail),
                    HttpStatus.BAD_GATEWAY);
        }
    }

    private List<String> notificationUrls() {
        String url = properties.getNotificationUrl();
        return (url == null || url.isBlank()) ? null : List.of(url);
    }

    private RestClient restClient() {
        if (restClient == null) {
            throw new BusinessException("Integração PagBank não está configurada",
                    HttpStatus.SERVICE_UNAVAILABLE);
        }
        return restClient;
    }

    private String describe(List<PagBankOrder.ErrorMessage> errors) {
        return errors.stream()
                .map(e -> e.parameter_name() != null
                        ? e.parameter_name() + " " + e.description()
                        : e.description())
                .reduce((a, b) -> a + "; " + b)
                .orElse("motivo não informado");
    }

    private String shorten(String value) {
        if (value == null || value.isBlank()) return "sem detalhes";
        return value.length() > 200 ? value.substring(0, 200) + "..." : value;
    }
}
