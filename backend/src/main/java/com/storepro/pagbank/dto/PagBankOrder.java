package com.storepro.pagbank.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Contrato do endpoint POST /orders do PagBank, na variante "pedido com QR Code".
 * Os valores monetários vão em centavos (unit_amount, amount.value) — mandar reais
 * cobraria cem vezes menos do cliente.
 */
public class PagBankOrder {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Request(
            String reference_id,
            Customer customer,
            List<Item> items,
            List<QrCodeRequest> qr_codes,
            List<String> notification_urls
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Customer(String name, String email, String tax_id) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Item(String name, int quantity, long unit_amount) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record QrCodeRequest(Amount amount, String expiration_date, List<String> arrangements) {}

    public record Amount(long value) {}

    // ---------------------------------------------------------------- resposta

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Response(
            String id,
            String reference_id,
            List<QrCodeResponse> qr_codes,
            List<Charge> charges,
            List<ErrorMessage> error_messages
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record QrCodeResponse(String id, String text, String expiration_date, List<Link> links) {

        /** O PagBank devolve o PNG do QR num link público, servível direto no <img> do PDV. */
        public String pngUrl() {
            if (links == null) return null;
            return links.stream()
                    .filter(l -> "QRCODE.PNG".equalsIgnoreCase(l.rel()))
                    .map(Link::href)
                    .findFirst()
                    .orElse(null);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Link(String rel, String href, String media, String type) {}

    /**
     * Só aparece depois que alguém paga. Enquanto o QR não foi pago, o pedido vem
     * sem a lista de charges — é assim que o PDV sabe que ainda está esperando.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Charge(String id, String status, Amount amount, PaymentResponse payment_response) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PaymentResponse(String code, String message, String reference) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ErrorMessage(String code, String description, String parameter_name) {}
}
