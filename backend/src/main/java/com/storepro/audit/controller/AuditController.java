package com.storepro.audit.controller;

import com.storepro.audit.entity.AuditLog;
import com.storepro.audit.service.AuditService;
import com.storepro.common.dto.ApiResponse;
import com.storepro.common.dto.PageResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/audit")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Auditoria", description = "Logs de auditoria do sistema")
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    @Operation(summary = "Listar logs de auditoria")
    public ResponseEntity<ApiResponse<PageResponse<AuditLog>>> list(
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String operation,
            @RequestParam(required = false) UUID userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                auditService.list(entityType, operation, userId, startDate, endDate, page, size)));
    }
}
