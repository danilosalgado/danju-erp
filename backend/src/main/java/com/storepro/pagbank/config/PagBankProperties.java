package com.storepro.pagbank.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuração da API REST do PagBank, usada para gerar o QR Code de PIX no PDV.
 * Separada de TerminalProperties porque são caminhos independentes: dá para ter
 * PIX sem maquininha e maquininha sem PIX.
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.pagbank")
public class PagBankProperties {

    private boolean enabled = false;

    /** "sandbox" ou "production". */
    private String env = "sandbox";

    /** Token Bearer da conta PagBank. Nunca versionado — vem do .env. */
    private String token;

    /**
     * CPF/CNPJ usado como pagador quando a venda não tem cliente cadastrado.
     * O PagBank recusa a cobrança sem um documento válido, e a maioria das vendas
     * de balcão não tem cliente — então sem isto o PIX não funciona.
     */
    private String fallbackTaxId;

    /** Nome do pagador quando a venda é de balcão. */
    private String fallbackCustomerName = "Consumidor";

    private String fallbackCustomerEmail = "naoinformado@danju.local";

    /**
     * URL pública que o PagBank chama quando o pagamento muda de estado.
     * Vazia é aceitável: o PDV também consulta o status por conta própria, então
     * a venda fecha do mesmo jeito — só depende do polling em vez do aviso.
     */
    private String notificationUrl;

    /** Por quanto tempo o QR Code aceita pagamento. */
    private int qrExpirationMinutes = 15;

    public String getBaseUrl() {
        return "production".equalsIgnoreCase(env)
                ? "https://api.pagseguro.com"
                : "https://sandbox.api.pagseguro.com";
    }

    public boolean isConfigured() {
        return enabled
                && token != null && !token.isBlank()
                && fallbackTaxId != null && !fallbackTaxId.isBlank();
    }
}
