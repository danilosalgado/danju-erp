package com.storepro.invoice;

import com.storepro.common.dto.ApiResponse;
import com.storepro.invoice.dto.NFeImportResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/invoices")
@RequiredArgsConstructor
@Tag(name = "Notas Fiscais", description = "Importação de NF-e")
public class InvoiceImportController {

    private final InvoiceImportService importService;

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('ADMIN', 'GERENTE', 'ESTOQUISTA')")
    @Operation(summary = "Importar NF-e (XML)")
    public ResponseEntity<ApiResponse<NFeImportResult>> importNFe(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Arquivo vazio"));
        }
        NFeImportResult result = importService.importNFe(file);
        return ResponseEntity.ok(ApiResponse.success("NF-e importada com sucesso", result));
    }
}
