package com.storepro.customer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateCustomerRequest {
    @NotBlank(message = "Nome é obrigatório")
    @Size(max = 200)
    private String name;
    private String cpfCnpj;
    private String phone;
    private String email;
    private LocalDate birthDate;
    private String zipCode;
    private String street;
    private String number;
    private String complement;
    private String neighborhood;
    private String city;
    private String state;
    private BigDecimal creditLimit;
    private String notes;
}
