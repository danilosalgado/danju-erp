package com.storepro.product.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class CreateProductRequest {

    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 200)
    private String name;

    private String internalCode;
    private String sku;
    private String barcode;
    private String description;
    private UUID categoryId;
    private UUID supplierId;
    private String brand;

    @Size(max = 20)
    private String unit = "UN";

    @NotNull(message = "Preço de custo é obrigatório")
    @DecimalMin(value = "0.0", message = "Preço de custo deve ser positivo")
    private BigDecimal costPrice;

    @NotNull(message = "Preço de venda é obrigatório")
    @DecimalMin(value = "0.0", message = "Preço de venda deve ser positivo")
    private BigDecimal salePrice;

    private BigDecimal weight;
    private BigDecimal width;
    private BigDecimal height;
    private BigDecimal depth;

    @Min(value = 0, message = "Estoque mínimo deve ser positivo")
    private int minStock = 0;

    @Min(value = 0, message = "Estoque atual deve ser positivo")
    private int currentStock = 0;

    private String stockLocation;
}
