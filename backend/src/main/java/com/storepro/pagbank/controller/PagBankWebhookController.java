package com.storepro.pagbank.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.storepro.terminal.service.TerminalPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recebe o aviso do PagBank quando um pagamento muda de estado.
 *
 * Não confia no conteúdo do aviso: ele serve só para dizer "o pedido X mudou".
 * Quem decide se foi pago é a consulta que o backend faz de volta na API do
 * PagBank — assim um POST forjado nesta URL não consegue marcar venda como paga.
 */
@Slf4j
@RestController
@RequestMapping("/pagbank")
@RequiredArgsConstructor
@Tag(name = "PagBank", description = "Notificações de pagamento")
public class PagBankWebhookController {

    private final TerminalPaymentService terminalPaymentService;

    @PostMapping("/webhook")
    @Operation(summary = "Notificação de mudança de status do PagBank")
    public ResponseEntity<Void> webhook(@RequestBody JsonNode body) {
        String orderId = body.path("id").asText(null);
        if (orderId == null || orderId.isBlank()) {
            // Responder 200 mesmo assim: um 4xx faz o PagBank reenviar em loop
            // um aviso que a gente nunca vai conseguir processar.
            log.warn("Webhook do PagBank sem id de pedido");
            return ResponseEntity.ok().build();
        }

        try {
            terminalPaymentService.handleWebhook(orderId);
        } catch (RuntimeException e) {
            log.error("Erro ao processar webhook do pedido {}: {}", orderId, e.getMessage());
        }
        return ResponseEntity.ok().build();
    }
}
