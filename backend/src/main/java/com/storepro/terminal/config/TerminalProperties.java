package com.storepro.terminal.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuração da integração com a maquininha (PagBank / Moderninha Smart).
 * Tudo vem de variável de ambiente: enquanto não houver token, o PDV continua
 * funcionando no modo manual e o botão "Cobrar na maquininha" não aparece.
 */
@Data
@Component
@ConfigurationProperties(prefix = "app.terminal")
public class TerminalProperties {

    /** Liga o fluxo automático de cobrança. */
    private boolean enabled = false;

    /** Terminal usado quando o PDV não informa um. */
    private String defaultTerminalId = "CAIXA01";

    /**
     * Segredo compartilhado com o app da maquininha (header X-Terminal-Token).
     * O app roda fora da sessão de um usuário, então não tem JWT para apresentar.
     */
    private String agentToken;

    /** Quanto tempo a cobrança fica válida esperando a maquininha. */
    private int timeoutSeconds = 180;

    public boolean isConfigured() {
        return enabled && agentToken != null && !agentToken.isBlank();
    }
}
