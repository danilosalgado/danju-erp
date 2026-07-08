package com.storepro.customer.service;

import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.customer.dto.CreateCustomerRequest;
import com.storepro.customer.dto.CustomerResponse;
import com.storepro.customer.entity.Customer;
import com.storepro.customer.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional
    public CustomerResponse create(CreateCustomerRequest req) {
        if (req.getCpfCnpj() != null && !req.getCpfCnpj().isBlank()
                && customerRepository.existsByCpfCnpj(req.getCpfCnpj())) {
            throw new BusinessException("CPF/CNPJ já cadastrado", HttpStatus.CONFLICT);
        }

        Customer customer = Customer.builder()
                .name(req.getName()).cpfCnpj(req.getCpfCnpj()).phone(req.getPhone())
                .email(req.getEmail()).birthDate(req.getBirthDate())
                .zipCode(req.getZipCode()).street(req.getStreet()).number(req.getNumber())
                .complement(req.getComplement()).neighborhood(req.getNeighborhood())
                .city(req.getCity()).state(req.getState())
                .creditLimit(req.getCreditLimit() != null ? req.getCreditLimit() : BigDecimal.ZERO)
                .notes(req.getNotes()).active(true)
                .build();

        return toResponse(customerRepository.save(customer));
    }

    @Transactional(readOnly = true)
    public CustomerResponse getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> list(String search, Boolean active, int page, int size) {
        Page<Customer> p = customerRepository.findWithFilters(search, active,
                PageRequest.of(page, size, Sort.by("name")));
        return PageResponse.of(p.getContent().stream().map(this::toResponse).toList(),
                page, size, p.getTotalElements());
    }

    @Transactional
    public void addLoyaltyPoints(UUID id, int points) {
        Customer c = findById(id);
        c.setLoyaltyPoints(c.getLoyaltyPoints() + points);
        customerRepository.save(c);
    }

    @Transactional
    public void addCashback(UUID id, BigDecimal amount) {
        Customer c = findById(id);
        c.setCashbackBalance(c.getCashbackBalance().add(amount));
        customerRepository.save(c);
    }

    private Customer findById(UUID id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente", "id", id));
    }

    private CustomerResponse toResponse(Customer c) {
        return CustomerResponse.builder()
                .id(c.getId()).name(c.getName()).cpfCnpj(c.getCpfCnpj()).phone(c.getPhone())
                .email(c.getEmail()).birthDate(c.getBirthDate()).city(c.getCity()).state(c.getState())
                .loyaltyPoints(c.getLoyaltyPoints()).cashbackBalance(c.getCashbackBalance())
                .creditLimit(c.getCreditLimit()).active(c.isActive()).createdAt(c.getCreatedAt())
                .build();
    }
}
