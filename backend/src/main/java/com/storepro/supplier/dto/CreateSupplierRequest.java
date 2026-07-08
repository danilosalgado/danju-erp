package com.storepro.supplier.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateSupplierRequest {

    @NotBlank(message = "Razão social é obrigatória")
    @Size(max = 200)
    private String companyName;

    @Size(max = 200)
    private String tradeName;

    @Size(max = 18)
    private String cnpj;

    private String stateRegistration;
    private String zipCode;
    private String street;
    private String number;
    private String complement;
    private String neighborhood;
    private String city;
    private String state;
    private String phone;
    private String phone2;
    private String email;
    private String contactPerson;
    private String notes;
}
