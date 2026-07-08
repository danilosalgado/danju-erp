package com.storepro.customer.entity;

import com.storepro.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "customers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Customer extends BaseEntity {

    @Column(nullable = false, length = 200)
    private String name;

    @Column(name = "cpf_cnpj", length = 18, unique = true)
    private String cpfCnpj;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String email;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    @Column(name = "zip_code", length = 10)
    private String zipCode;

    @Column(length = 200)
    private String street;

    @Column(length = 20)
    private String number;

    @Column(length = 100)
    private String complement;

    @Column(length = 100)
    private String neighborhood;

    @Column(length = 100)
    private String city;

    @Column(length = 2)
    private String state;

    @Column(name = "loyalty_points", nullable = false)
    @Builder.Default
    private int loyaltyPoints = 0;

    @Column(name = "cashback_balance", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal cashbackBalance = BigDecimal.ZERO;

    @Column(name = "credit_limit", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal creditLimit = BigDecimal.ZERO;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
