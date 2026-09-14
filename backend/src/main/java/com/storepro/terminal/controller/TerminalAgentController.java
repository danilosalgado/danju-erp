package com.storepro.terminal.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.terminal.dto.TerminalPaymentResponse;
import com.storepro.terminal.dto.TerminalResultRequest;
import com.storepro.terminal.dto.TerminalTaskResponse;
import com.storepro.terminal.service.TerminalAgentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

/**
 * Lado da maquininha. Consumido pelo app Android instalado na Moderninha Smart,
 * que roda o PlugPag e devolve o resultado.
 *
 * Não usa JWT: o app não pertence a um usuário logado. A autenticação é um
 * segredo compartilhado no header X-Terminal-Token — por isso estas rotas ficam
 * fora do filtro de sessão e validam o token uma a uma.
 */
@RestController
@RequestMapping("/terminal-agent")
@RequiredArgsConstructor
@Tag(name = "Maquininha (agente)", description = "Consumido pelo app da Moderninha Smart")
public class TerminalAgentController {

    private static final String TOKEN_HEADER = "X-Terminal-Token";

    private final TerminalAgentService service;

    @GetMapping("/next")
    @Operation(summary = "Buscar a próxima cobrança pendente deste terminal")
    public ResponseEntity<ApiResponse<TerminalTaskResponse>> next(
            @RequestHeader(value = TOKEN_HEADER, required = false) String token,
            @RequestParam String terminalId) {
        service.assertAgentToken(token);
        Optional<TerminalTaskResponse> task = service.claimNext(terminalId);
        // Sem cobranca pendente: 204 para o app nao precisar interpretar corpo vazio.
        if (task.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(ApiResponse.success(task.get()));
    }

    @PostMapping("/{id}/result")
    @Operation(summary = "Devolver o resultado da transação")
    public ResponseEntity<ApiResponse<TerminalPaymentResponse>> result(
            @RequestHeader(value = TOKEN_HEADER, required = false) String token,
            @PathVariable UUID id,
            @Valid @RequestBody TerminalResultRequest request) {
        service.assertAgentToken(token);
        return ResponseEntity.ok(ApiResponse.success("Resultado registrado", service.registerResult(id, request)));
    }
}
