package com.storepro.sale.service;

import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.customer.entity.Customer;
import com.storepro.customer.repository.CustomerRepository;
import com.storepro.product.entity.Product;
import com.storepro.product.repository.ProductRepository;
import com.storepro.sale.dto.CreateSaleRequest;
import com.storepro.sale.dto.SaleResponse;
import com.storepro.sale.entity.Sale;
import com.storepro.sale.entity.SaleItem;
import com.storepro.sale.entity.SalePayment;
import com.storepro.sale.repository.SaleRepository;
import com.storepro.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;

    @Transactional
    public SaleResponse createSale(CreateSaleRequest request) {
        User currentUser = getCurrentUser();

        Customer customer = null;
        if (request.getCustomerId() != null) {
            customer = customerRepository.findById(request.getCustomerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Cliente", "id", request.getCustomerId()));
        }

        Sale sale = Sale.builder()
                .customer(customer)
                .user(currentUser)
                .status("FINALIZADA")
                .notes(request.getNotes())
                .items(new ArrayList<>())
                .payments(new ArrayList<>())
                .build();

        // Process items
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CreateSaleRequest.SaleItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", "id", itemReq.getProductId()));

            if (product.getCurrentStock() < itemReq.getQuantity().intValue()) {
                throw new BusinessException(
                        String.format("Estoque insuficiente para '%s'. Disponível: %d",
                                product.getName(), product.getCurrentStock()),
                        HttpStatus.BAD_REQUEST);
            }

            BigDecimal itemDiscount = itemReq.getDiscount() != null ? itemReq.getDiscount() : BigDecimal.ZERO;
            BigDecimal itemTotal = product.getSalePrice()
                    .multiply(itemReq.getQuantity())
                    .subtract(itemDiscount);

            SaleItem item = SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .productName(product.getName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getSalePrice())
                    .discount(itemDiscount)
                    .totalPrice(itemTotal)
                    .unit(product.getUnit())
                    .build();

            sale.getItems().add(item);
            subtotal = subtotal.add(itemTotal);

            // Decrease stock (round up for fractional units)
            product.setCurrentStock(product.getCurrentStock() - itemReq.getQuantity().intValue());
            productRepository.save(product);
        }

        sale.setSubtotal(subtotal);

        // Apply sale-level discount
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (request.getDiscountType() != null && request.getDiscountValue() != null) {
            sale.setDiscountType(request.getDiscountType());
            sale.setDiscountValue(request.getDiscountValue());
            if ("PERCENTUAL".equals(request.getDiscountType())) {
                discountAmount = subtotal.multiply(request.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            } else {
                discountAmount = request.getDiscountValue();
            }
        }
        sale.setDiscountAmount(discountAmount);

        BigDecimal surcharge = request.getSurcharge() != null ? request.getSurcharge() : BigDecimal.ZERO;
        sale.setSurcharge(surcharge);

        BigDecimal total = subtotal.subtract(discountAmount).add(surcharge);
        sale.setTotal(total);

        // Process payments
        BigDecimal totalPaid = BigDecimal.ZERO;
        for (CreateSaleRequest.SalePaymentRequest payReq : request.getPayments()) {
            SalePayment payment = SalePayment.builder()
                    .sale(sale)
                    .method(payReq.getMethod())
                    .amount(payReq.getAmount())
                    .installments(payReq.getInstallments() > 0 ? payReq.getInstallments() : 1)
                    .reference(payReq.getReference())
                    .build();

            // Calculate change for cash payments
            if ("DINHEIRO".equals(payReq.getMethod())) {
                BigDecimal remaining = total.subtract(totalPaid);
                if (payReq.getAmount().compareTo(remaining) > 0) {
                    payment.setChangeAmount(payReq.getAmount().subtract(remaining));
                }
            }

            sale.getPayments().add(payment);
            totalPaid = totalPaid.add(payReq.getAmount());
        }

        if (totalPaid.compareTo(total) < 0) {
            throw new BusinessException(
                    String.format("Pagamento insuficiente. Total: R$ %s, Pago: R$ %s",
                            total.setScale(2), totalPaid.setScale(2)),
                    HttpStatus.BAD_REQUEST);
        }

        Sale saved = saleRepository.save(sale);
        log.info("Venda #{} realizada: R$ {}", saved.getId(), total);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public SaleResponse getById(UUID id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venda", "id", id));
        return toResponse(sale);
    }

    @Transactional(readOnly = true)
    public PageResponse<SaleResponse> list(String status, LocalDateTime start, LocalDateTime end, int page, int size) {
        Page<Sale> salePage = saleRepository.findWithFilters(status, start, end, PageRequest.of(page, size));
        return PageResponse.of(
                salePage.getContent().stream().map(this::toResponse).toList(),
                page, size, salePage.getTotalElements());
    }

    @Transactional
    public void cancelSale(UUID id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venda", "id", id));

        if ("CANCELADA".equals(sale.getStatus())) {
            throw new BusinessException("Venda já está cancelada");
        }

        // Restore stock
        for (SaleItem item : sale.getItems()) {
            if (!item.isCancelled()) {
                Product product = item.getProduct();
                product.setCurrentStock(product.getCurrentStock() + item.getQuantity().intValue());
                productRepository.save(product);
            }
        }

        sale.setStatus("CANCELADA");
        saleRepository.save(sale);
        log.info("Venda #{} cancelada", id);
    }

    @Transactional
    public SaleResponse updateSale(UUID id, CreateSaleRequest request) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venda", "id", id));

        if ("CANCELADA".equals(sale.getStatus())) {
            throw new BusinessException("Não é possível editar uma venda cancelada");
        }

        // 1. Restore stock from old items
        for (SaleItem item : sale.getItems()) {
            if (!item.isCancelled()) {
                Product product = item.getProduct();
                product.setCurrentStock(product.getCurrentStock() + item.getQuantity().intValue());
                productRepository.save(product);
            }
        }

        // 2. Clear old items and payments
        sale.getItems().clear();
        sale.getPayments().clear();

        // 3. Process new items
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CreateSaleRequest.SaleItemRequest itemReq : request.getItems()) {
            Product product = productRepository.findById(itemReq.getProductId())
                    .orElseThrow(() -> new ResourceNotFoundException("Produto", "id", itemReq.getProductId()));

            if (product.getCurrentStock() < itemReq.getQuantity().intValue()) {
                throw new BusinessException(
                        String.format("Estoque insuficiente para '%s'. Disponível: %d",
                                product.getName(), product.getCurrentStock()),
                        HttpStatus.BAD_REQUEST);
            }

            BigDecimal itemDiscount = itemReq.getDiscount() != null ? itemReq.getDiscount() : BigDecimal.ZERO;
            BigDecimal itemTotal = product.getSalePrice()
                    .multiply(itemReq.getQuantity())
                    .subtract(itemDiscount);

            SaleItem item = SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .productName(product.getName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getSalePrice())
                    .discount(itemDiscount)
                    .totalPrice(itemTotal)
                    .unit(product.getUnit())
                    .build();

            sale.getItems().add(item);
            subtotal = subtotal.add(itemTotal);

            product.setCurrentStock(product.getCurrentStock() - itemReq.getQuantity().intValue());
            productRepository.save(product);
        }

        sale.setSubtotal(subtotal);

        // 4. Recalculate discounts
        BigDecimal discountAmount = BigDecimal.ZERO;
        if (request.getDiscountType() != null && request.getDiscountValue() != null) {
            sale.setDiscountType(request.getDiscountType());
            sale.setDiscountValue(request.getDiscountValue());
            if ("PERCENTUAL".equals(request.getDiscountType())) {
                discountAmount = subtotal.multiply(request.getDiscountValue())
                        .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            } else {
                discountAmount = request.getDiscountValue();
            }
        }
        sale.setDiscountAmount(discountAmount);

        BigDecimal surcharge = request.getSurcharge() != null ? request.getSurcharge() : BigDecimal.ZERO;
        sale.setSurcharge(surcharge);

        BigDecimal total = subtotal.subtract(discountAmount).add(surcharge);
        sale.setTotal(total);

        // 5. Process new payments
        BigDecimal totalPaid = BigDecimal.ZERO;
        for (CreateSaleRequest.SalePaymentRequest payReq : request.getPayments()) {
            SalePayment payment = SalePayment.builder()
                    .sale(sale)
                    .method(payReq.getMethod())
                    .amount(payReq.getAmount())
                    .installments(payReq.getInstallments() > 0 ? payReq.getInstallments() : 1)
                    .reference(payReq.getReference())
                    .build();

            if ("DINHEIRO".equals(payReq.getMethod())) {
                BigDecimal remaining = total.subtract(totalPaid);
                if (payReq.getAmount().compareTo(remaining) > 0) {
                    payment.setChangeAmount(payReq.getAmount().subtract(remaining));
                }
            }

            sale.getPayments().add(payment);
            totalPaid = totalPaid.add(payReq.getAmount());
        }

        sale.setNotes(request.getNotes());
        Sale saved = saleRepository.save(sale);
        log.info("Venda #{} editada: R$ {}", saved.getId(), total);

        return toResponse(saved);
    }

    // Dashboard queries
    @Transactional(readOnly = true)
    public BigDecimal getTotalRevenue(LocalDateTime start, LocalDateTime end) {
        return saleRepository.sumTotalByPeriod(start, end);
    }

    @Transactional(readOnly = true)
    public long getSalesCount(LocalDateTime start, LocalDateTime end) {
        return saleRepository.countByPeriod(start, end);
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user;
        }
        throw new BusinessException("Usuário não autenticado", HttpStatus.UNAUTHORIZED);
    }

    private SaleResponse toResponse(Sale s) {
        return SaleResponse.builder()
                .id(s.getId())
                .saleNumber(s.getSaleNumber())
                .customerName(s.getCustomer() != null ? s.getCustomer().getName() : null)
                .userName(s.getUser() != null ? s.getUser().getName() : null)
                .subtotal(s.getSubtotal())
                .discountType(s.getDiscountType())
                .discountValue(s.getDiscountValue())
                .discountAmount(s.getDiscountAmount())
                .surcharge(s.getSurcharge())
                .total(s.getTotal())
                .status(s.getStatus())
                .notes(s.getNotes())
                .items(s.getItems() != null ? s.getItems().stream().map(i ->
                        SaleResponse.ItemResponse.builder()
                                .id(i.getId())
                                .productId(i.getProduct().getId())
                                .productName(i.getProductName())
                                .quantity(i.getQuantity())
                                .unit(i.getUnit())
                                .unitPrice(i.getUnitPrice())
                                .discount(i.getDiscount())
                                .totalPrice(i.getTotalPrice())
                                .cancelled(i.isCancelled())
                                .build()
                ).toList() : null)
                .payments(s.getPayments() != null ? s.getPayments().stream().map(p ->
                        SaleResponse.PaymentResponse.builder()
                                .id(p.getId())
                                .method(p.getMethod())
                                .amount(p.getAmount())
                                .changeAmount(p.getChangeAmount())
                                .installments(p.getInstallments())
                                .reference(p.getReference())
                                .build()
                ).toList() : null)
                .createdAt(s.getCreatedAt())
                .build();
    }
}
