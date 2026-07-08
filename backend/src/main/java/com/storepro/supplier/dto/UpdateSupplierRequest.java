package com.storepro.supplier.dto;

import lombok.Data;

@Data
public class UpdateSupplierRequest {
    private String companyName;
    private String tradeName;
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
    private Boolean active;
}
