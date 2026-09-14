package com.storepro.customer.service;

import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.customer.dto.CreateCustomerRequest;
import com.storepro.customer.dto.CustomerResponse;
import com.storepro.customer.dto.CustomerSummaryResponse;
import com.storepro.customer.dto.UpdateCustomerRequest;
import com.storepro.customer.entity.Customer;
import com.storepro.customer.repository.CustomerRepository;
import com.storepro.sale.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final SaleRepository saleRepository;

    @Transactional
    public CustomerResponse create(CreateCustomerRequest req) {
        String cpfCnpj = normalize(req.getCpfCnpj());
        if (cpfCnpj != null && customerRepository.existsByCpfCnpj(cpfCnpj)) {
            throw new BusinessException("CPF/CNPJ já cadastrado", HttpStatus.CONFLICT);
        }

        Customer customer = Customer.builder()
                .name(req.getName().trim()).cpfCnpj(cpfCnpj).phone(normalize(req.getPhone()))
                .email(normalize(req.getEmail())).birthDate(req.getBirthDate())
                .zipCode(normalize(req.getZipCode())).street(normalize(req.getStreet()))
                .number(normalize(req.getNumber())).complement(normalize(req.getComplement()))
                .neighborhood(normalize(req.getNeighborhood()))
                .city(normalize(req.getCity())).state(normalize(req.getState()))
                .creditLimit(req.getCreditLimit() != null ? req.getCreditLimit() : BigDecimal.ZERO)
                .notes(normalize(req.getNotes())).active(true)
                .build();

        return toResponse(customerRepository.save(customer));
    }

    @Transactional
    public CustomerResponse update(UUID id, UpdateCustomerRequest req) {
        Customer c = findById(id);

        String cpfCnpj = normalize(req.getCpfCnpj());
        // existsByCpfCnpj acusaria conflito com o próprio cliente quando o CPF não muda.
        if (cpfCnpj != null && !cpfCnpj.equals(c.getCpfCnpj())
                && customerRepository.existsByCpfCnpj(cpfCnpj)) {
            throw new BusinessException("CPF/CNPJ já cadastrado", HttpStatus.CONFLICT);
        }

        c.setName(req.getName().trim());
        c.setCpfCnpj(cpfCnpj);
        c.setPhone(normalize(req.getPhone()));
        c.setEmail(normalize(req.getEmail()));
        c.setBirthDate(req.getBirthDate());
        c.setZipCode(normalize(req.getZipCode()));
        c.setStreet(normalize(req.getStreet()));
        c.setNumber(normalize(req.getNumber()));
        c.setComplement(normalize(req.getComplement()));
        c.setNeighborhood(normalize(req.getNeighborhood()));
        c.setCity(normalize(req.getCity()));
        c.setState(normalize(req.getState()));
        if (req.getCreditLimit() != null) c.setCreditLimit(req.getCreditLimit());
        c.setNotes(normalize(req.getNotes()));
        if (req.getActive() != null) c.setActive(req.getActive());

        return toResponse(customerRepository.save(c));
    }

    /** Desativa em vez de apagar: as vendas já registradas referenciam a linha. */
    @Transactional
    public void deactivate(UUID id) {
        Customer c = findById(id);
        c.setActive(false);
        customerRepository.save(c);
    }

    @Transactional
    public CustomerResponse reactivate(UUID id) {
        Customer c = findById(id);
        c.setActive(true);
        return toResponse(customerRepository.save(c));
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

    /** Ficha do CRM: dados do cliente + o que ele já comprou. */
    @Transactional(readOnly = true)
    public CustomerSummaryResponse getSummary(UUID id) {
        Customer customer = findById(id);

        List<Object[]> statsRows = saleRepository.findCustomerStats(id);
        long totalPurchases = 0;
        BigDecimal totalSpent = BigDecimal.ZERO;
        LocalDateTime lastPurchaseAt = null;
        if (!statsRows.isEmpty()) {
            Object[] row = statsRows.get(0);
            totalPurchases = row[0] != null ? ((Number) row[0]).longValue() : 0;
            totalSpent = row[1] != null ? (BigDecimal) row[1] : BigDecimal.ZERO;
            lastPurchaseAt = (LocalDateTime) row[2];
        }

        BigDecimal averageTicket = totalPurchases > 0
                ? totalSpent.divide(BigDecimal.valueOf(totalPurchases), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        List<CustomerSummaryResponse.PurchaseEntry> recent = saleRepository
                .findByCustomer(id, PageRequest.of(0, 10)).stream()
                .map(s -> CustomerSummaryResponse.PurchaseEntry.builder()
                        .id(s.getId())
                        .saleNumber(s.getSaleNumber())
                        .date(s.getCreatedAt())
                        .total(s.getTotal())
                        .status(s.getStatus())
                        .itemCount(s.getItems().size())
                        .build())
                .toList();

        return CustomerSummaryResponse.builder()
                .customer(toResponse(customer))
                .totalPurchases(totalPurchases)
                .totalSpent(totalSpent)
                .averageTicket(averageTicket)
                .lastPurchaseAt(lastPurchaseAt)
                .recentPurchases(recent)
                .build();
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

    /** Campo opcional vazio vira null: "" ocuparia o índice único de cpf_cnpj. */
    private String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private CustomerResponse toResponse(Customer c) {
        return CustomerResponse.builder()
                .id(c.getId()).name(c.getName()).cpfCnpj(c.getCpfCnpj()).phone(c.getPhone())
                .email(c.getEmail()).birthDate(c.getBirthDate())
                .zipCode(c.getZipCode()).street(c.getStreet()).number(c.getNumber())
                .complement(c.getComplement()).neighborhood(c.getNeighborhood())
                .city(c.getCity()).state(c.getState()).notes(c.getNotes())
                .loyaltyPoints(c.getLoyaltyPoints()).cashbackBalance(c.getCashbackBalance())
                .creditLimit(c.getCreditLimit()).active(c.isActive()).createdAt(c.getCreatedAt())
                .build();
    }
}
