package com.storepro.customer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerResponse {
    private UUID id;
    private String name;
    private String cpfCnpj;
    private String phone;
    private String email;
    private LocalDate birthDate;
    private String city;
    private String state;
    private int loyaltyPoints;
    private BigDecimal cashbackBalance;
    private BigDecimal creditLimit;
    private boolean active;
    private LocalDateTime createdAt;
}
