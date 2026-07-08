package com.storepro.invoice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NFeImportResult {

    private String supplierName;
    private String supplierCnpj;
    private String invoiceNumber;
    private BigDecimal totalValue;
    private List<NFeProduct> products;
    private int totalCreated;
    private int totalUpdated;
    private int totalErrors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NFeProduct {
        private String code;
        private String barcode;
        private String name;
        private String ncm;
        private String unit;
        private int quantity;
        private BigDecimal unitPrice;
        private BigDecimal totalPrice;
        private String status; // CREATED, UPDATED, ERROR
        private String message;
    }
}
