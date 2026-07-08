package com.storepro.audit.service;

import com.storepro.audit.entity.AuditLog;
import com.storepro.audit.repository.AuditLogRepository;
import com.storepro.common.dto.PageResponse;
import com.storepro.user.entity.User;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional
    public void logAction(String entityType, UUID entityId, String operation, String description) {
        try {
            UUID userId = null;
            String userEmail = null;
            String ipAddress = null;

            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof User user) {
                userId = user.getId();
                userEmail = user.getEmail();
            }

            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest request = attrs.getRequest();
                ipAddress = getClientIp(request);
            }

            AuditLog auditLog = AuditLog.builder()
                    .userId(userId)
                    .userEmail(userEmail)
                    .entityType(entityType)
                    .entityId(entityId)
                    .operation(operation)
                    .ipAddress(ipAddress)
                    .description(description)
                    .createdAt(LocalDateTime.now())
                    .build();

            auditLogRepository.save(auditLog);
        } catch (Exception e) {
            log.error("Erro ao registrar log de auditoria: {}", e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLog> list(String entityType, String operation, UUID userId,
                                        LocalDateTime start, LocalDateTime end, int page, int size) {
        Page<AuditLog> p = auditLogRepository.findWithFilters(entityType, operation, userId, start, end,
                PageRequest.of(page, size));
        return PageResponse.of(p.getContent(), page, size, p.getTotalElements());
    }

    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty()) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty()) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }
}
