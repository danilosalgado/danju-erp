package com.storepro.supplier.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SupplierResponse {
    private UUID id;
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
    private boolean active;
    private int avgDeliveryDays;
    private LocalDateTime createdAt;
}
