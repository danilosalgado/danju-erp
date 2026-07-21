package com.storepro.purchase.service;

import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.product.entity.Product;
import com.storepro.product.repository.ProductRepository;
import com.storepro.purchase.dto.CreatePurchaseRequest;
import com.storepro.purchase.dto.PurchaseResponse;
import com.storepro.purchase.entity.Purchase;
import com.storepro.purchase.entity.PurchaseItem;
import com.storepro.purchase.repository.PurchaseRepository;
import com.storepro.supplier.entity.Supplier;
import com.storepro.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PurchaseService {

    private final PurchaseRepository purchaseRepository;
    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;

    @Transactional
    public PurchaseResponse create(CreatePurchaseRequest request) {
        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", "id", request.getSupplierId()));
        }

        Purchase purchase = Purchase.builder()
                .supplier(supplier)
                .purchaseDate(request.getPurchaseDate() != null ? request.getPurchaseDate() : LocalDate.now())
                .notes(request.getNotes())
                .items(new ArrayList<>())
                .build();

        BigDecimal totalCost = BigDecimal.ZERO;
        for (CreatePurchaseRequest.PurchaseItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", "id", itemReq.getProductId()));

            BigDecimal itemTotal = itemReq.getUnitCost().multiply(itemReq.getQuantity());

            PurchaseItem item = PurchaseItem.builder()
                    .purchase(purchase)
                    .product(product)
                    .productName(product.getName())
                    .quantity(itemReq.getQuantity())
                    .unitCost(itemReq.getUnitCost())
                    .totalCost(itemTotal)
                    .build();

            purchase.getItems().add(item);
            totalCost = totalCost.add(itemTotal);

            // Increment stock
            product.setCurrentStock(product.getCurrentStock() + itemReq.getQuantity().intValue());
            productRepository.save(product);
        }

        purchase.setTotalCost(totalCost);
        Purchase saved = purchaseRepository.save(purchase);
        log.info("Compra registrada: R$ {}", totalCost);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PurchaseResponse getById(UUID id) {
        Purchase purchase = purchaseRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compra", "id", id));
        return toResponse(purchase);
    }

    @Transactional(readOnly = true)
    public PageResponse<PurchaseResponse> list(UUID supplierId, LocalDate startDate, LocalDate endDate, int page, int size) {
        Page<Purchase> purchasePage = purchaseRepository.findWithFilters(supplierId, startDate, endDate, PageRequest.of(page, size));
        return PageResponse.of(
                purchasePage.getContent().stream().map(this::toResponse).toList(),
                page, size, purchasePage.getTotalElements());
    }

    private PurchaseResponse toResponse(Purchase p) {
        return PurchaseResponse.builder()
                .id(p.getId())
                .supplierName(p.getSupplier() != null ? p.getSupplier().getCompanyName() : null)
                .purchaseDate(p.getPurchaseDate())
                .totalCost(p.getTotalCost())
                .notes(p.getNotes())
                .status(p.getStatus())
                .items(p.getItems() != null ? p.getItems().stream().map(i ->
                        PurchaseResponse.ItemResponse.builder()
                                .id(i.getId())
                                .productId(i.getProduct().getId())
                                .productName(i.getProductName())
                                .quantity(i.getQuantity())
                                .unitCost(i.getUnitCost())
                                .totalCost(i.getTotalCost())
                                .build()
                ).toList() : null)
                .createdAt(p.getCreatedAt())
                .build();
    }
}
