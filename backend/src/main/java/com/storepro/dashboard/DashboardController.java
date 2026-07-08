package com.storepro.dashboard;

import com.storepro.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@Tag(name = "Dashboard", description = "Indicadores e métricas do negócio")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping
    @Operation(summary = "Obter dados do dashboard")
    public ResponseEntity<ApiResponse<DashboardData>> getDashboard() {
        return ResponseEntity.ok(ApiResponse.success(dashboardService.getDashboard()));
    }
}
