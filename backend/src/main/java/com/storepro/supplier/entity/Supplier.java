package com.storepro.supplier.entity;

import com.storepro.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "suppliers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Supplier extends BaseEntity {

    @Column(name = "company_name", nullable = false, length = 200)
    private String companyName;

    @Column(name = "trade_name", length = 200)
    private String tradeName;

    @Column(length = 18, unique = true)
    private String cnpj;

    @Column(name = "state_registration", length = 30)
    private String stateRegistration;

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

    @Column(length = 20)
    private String phone;

    @Column(length = 20)
    private String phone2;

    @Column(length = 255)
    private String email;

    @Column(name = "contact_person", length = 150)
    private String contactPerson;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "avg_delivery_days")
    @Builder.Default
    private int avgDeliveryDays = 0;
}
