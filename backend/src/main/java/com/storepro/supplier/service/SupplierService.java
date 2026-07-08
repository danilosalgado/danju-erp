package com.storepro.supplier.service;

import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.supplier.dto.CreateSupplierRequest;
import com.storepro.supplier.dto.SupplierResponse;
import com.storepro.supplier.dto.UpdateSupplierRequest;
import com.storepro.supplier.entity.Supplier;
import com.storepro.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    @Transactional
    public SupplierResponse create(CreateSupplierRequest request) {
        if (request.getCnpj() != null && !request.getCnpj().isBlank()
                && supplierRepository.existsByCnpj(request.getCnpj())) {
            throw new BusinessException("CNPJ já cadastrado", HttpStatus.CONFLICT);
        }

        Supplier supplier = Supplier.builder()
                .companyName(request.getCompanyName())
                .tradeName(request.getTradeName())
                .cnpj(request.getCnpj())
                .stateRegistration(request.getStateRegistration())
                .zipCode(request.getZipCode())
                .street(request.getStreet())
                .number(request.getNumber())
                .complement(request.getComplement())
                .neighborhood(request.getNeighborhood())
                .city(request.getCity())
                .state(request.getState())
                .phone(request.getPhone())
                .phone2(request.getPhone2())
                .email(request.getEmail())
                .contactPerson(request.getContactPerson())
                .notes(request.getNotes())
                .active(true)
                .build();

        return toResponse(supplierRepository.save(supplier));
    }

    @Transactional(readOnly = true)
    public SupplierResponse getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<SupplierResponse> list(String search, Boolean active, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("companyName"));
        Page<Supplier> supplierPage = supplierRepository.findWithFilters(search, active, pageRequest);

        return PageResponse.of(
                supplierPage.getContent().stream().map(this::toResponse).toList(),
                page, size, supplierPage.getTotalElements()
        );
    }

    @Transactional
    public SupplierResponse update(UUID id, UpdateSupplierRequest request) {
        Supplier supplier = findById(id);

        if (request.getCompanyName() != null) supplier.setCompanyName(request.getCompanyName());
        if (request.getTradeName() != null) supplier.setTradeName(request.getTradeName());
        if (request.getCnpj() != null) {
            if (!request.getCnpj().equals(supplier.getCnpj()) && supplierRepository.existsByCnpj(request.getCnpj())) {
                throw new BusinessException("CNPJ já cadastrado", HttpStatus.CONFLICT);
            }
            supplier.setCnpj(request.getCnpj());
        }
        if (request.getStateRegistration() != null) supplier.setStateRegistration(request.getStateRegistration());
        if (request.getZipCode() != null) supplier.setZipCode(request.getZipCode());
        if (request.getStreet() != null) supplier.setStreet(request.getStreet());
        if (request.getNumber() != null) supplier.setNumber(request.getNumber());
        if (request.getComplement() != null) supplier.setComplement(request.getComplement());
        if (request.getNeighborhood() != null) supplier.setNeighborhood(request.getNeighborhood());
        if (request.getCity() != null) supplier.setCity(request.getCity());
        if (request.getState() != null) supplier.setState(request.getState());
        if (request.getPhone() != null) supplier.setPhone(request.getPhone());
        if (request.getPhone2() != null) supplier.setPhone2(request.getPhone2());
        if (request.getEmail() != null) supplier.setEmail(request.getEmail());
        if (request.getContactPerson() != null) supplier.setContactPerson(request.getContactPerson());
        if (request.getNotes() != null) supplier.setNotes(request.getNotes());
        if (request.getActive() != null) supplier.setActive(request.getActive());

        return toResponse(supplierRepository.save(supplier));
    }

    @Transactional
    public void delete(UUID id) {
        Supplier supplier = findById(id);
        supplier.setActive(false);
        supplierRepository.save(supplier);
    }

    private Supplier findById(UUID id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", "id", id));
    }

    private SupplierResponse toResponse(Supplier s) {
        return SupplierResponse.builder()
                .id(s.getId())
                .companyName(s.getCompanyName())
                .tradeName(s.getTradeName())
                .cnpj(s.getCnpj())
                .stateRegistration(s.getStateRegistration())
                .zipCode(s.getZipCode())
                .street(s.getStreet())
                .number(s.getNumber())
                .complement(s.getComplement())
                .neighborhood(s.getNeighborhood())
                .city(s.getCity())
                .state(s.getState())
                .phone(s.getPhone())
                .phone2(s.getPhone2())
                .email(s.getEmail())
                .contactPerson(s.getContactPerson())
                .notes(s.getNotes())
                .active(s.isActive())
                .avgDeliveryDays(s.getAvgDeliveryDays())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
