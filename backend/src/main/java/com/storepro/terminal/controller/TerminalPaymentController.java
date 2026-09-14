package com.storepro.terminal.controller;

import com.storepro.common.dto.ApiResponse;
import com.storepro.terminal.dto.CreateTerminalPaymentRequest;
import com.storepro.terminal.dto.TerminalPaymentResponse;
import com.storepro.terminal.service.TerminalPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/** Lado do PDV: pede a cobrança e acompanha até a maquininha responder. */
@RestController
@RequestMapping("/terminal-payments")
@RequiredArgsConstructor
@Tag(name = "Maquininha", description = "Cobrança automática no PDV via PagBank")
public class TerminalPaymentController {

    private final TerminalPaymentService service;

    @GetMapping("/config")
    @Operation(summary = "Saber quais cobranças automáticas estão disponíveis")
    public ResponseEntity<ApiResponse<Map<String, Object>>> config() {
        // Cartao e PIX sao independentes: da para ter PIX pela API sem a
        // maquininha integrada, e vice-versa.
        boolean card = service.isCardEnabled();
        boolean pix = service.isPixEnabled();
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "enabled", card || pix,
                "cardEnabled", card,
                "pixEnabled", pix,
                "defaultTerminalId", service.getDefaultTerminalId()
        )));
    }

    @PostMapping
    @Operation(summary = "Enviar cobrança para a maquininha")
    public ResponseEntity<ApiResponse<TerminalPaymentResponse>> create(
            @Valid @RequestBody CreateTerminalPaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Cobrança enviada à maquininha", service.create(request)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar o andamento da cobrança")
    public ResponseEntity<ApiResponse<TerminalPaymentResponse>> getStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(service.getStatus(id)));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancelar a cobrança pendente")
    public ResponseEntity<ApiResponse<TerminalPaymentResponse>> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("Cobrança cancelada", service.cancel(id)));
    }
}
