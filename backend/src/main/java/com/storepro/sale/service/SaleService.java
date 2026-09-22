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
import com.storepro.terminal.entity.TerminalPayment;
import com.storepro.terminal.service.TerminalPaymentService;
import com.storepro.user.entity.User;
import jakarta.persistence.EntityManager;
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
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final TerminalPaymentService terminalPaymentService;
    private final EntityManager entityManager;

    /**
     * Arredonda para centavos. Sem isso, itens com quantidade fracionada
     * (1,237 KG × R$ 80,90 = 100,0733) geram um total com precisão abaixo do
     * centavo, e o caixa que paga os R$ 100,07 exibidos é recusado por
     * "Pagamento insuficiente". Também alinha o valor em memória com a
     * escala 2 das colunas de dinheiro.
     */
    private static BigDecimal money(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

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

            if (product.getCurrentStock().compareTo(itemReq.getQuantity()) < 0) {
                throw new BusinessException(
                        String.format("Estoque insuficiente para '%s'. Disponível: %s",
                                product.getName(), product.getCurrentStock()),
                        HttpStatus.BAD_REQUEST);
            }

            BigDecimal itemDiscount = itemReq.getDiscount() != null ? itemReq.getDiscount() : BigDecimal.ZERO;
            BigDecimal itemTotal = money(product.getSalePrice()
                    .multiply(itemReq.getQuantity())
                    .subtract(itemDiscount));

            SaleItem item = SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .productName(product.getName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getSalePrice())
                    .unitCost(product.getCostPrice())
                    .discount(itemDiscount)
                    .totalPrice(itemTotal)
                    .unit(product.getUnit())
                    .build();

            sale.getItems().add(item);
            subtotal = subtotal.add(itemTotal);

            // Decrease stock (round up for fractional units)
            product.setCurrentStock(product.getCurrentStock().subtract(itemReq.getQuantity()));
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
        discountAmount = money(discountAmount);
        sale.setDiscountAmount(discountAmount);

        BigDecimal surcharge = money(request.getSurcharge() != null ? request.getSurcharge() : BigDecimal.ZERO);
        sale.setSurcharge(surcharge);

        BigDecimal total = money(subtotal.subtract(discountAmount).add(surcharge));
        sale.setTotal(total);

        // Process payments
        List<TerminalPayment> terminalPayments = new ArrayList<>();
        BigDecimal totalPaid = BigDecimal.ZERO;
        for (CreateSaleRequest.SalePaymentRequest payReq : request.getPayments()) {
            BigDecimal amount = money(payReq.getAmount());
            SalePayment payment = SalePayment.builder()
                    .sale(sale)
                    .method(payReq.getMethod())
                    .amount(amount)
                    .installments(payReq.getInstallments() > 0 ? payReq.getInstallments() : 1)
                    .reference(payReq.getReference())
                    .build();

            // Calculate change for cash payments
            if ("DINHEIRO".equals(payReq.getMethod())) {
                BigDecimal remaining = total.subtract(totalPaid);
                if (amount.compareTo(remaining) > 0) {
                    payment.setChangeAmount(amount.subtract(remaining));
                }
            }

            TerminalPayment terminal = applyTerminalPayment(payment, payReq, amount, null);
            if (terminal != null) terminalPayments.add(terminal);

            sale.getPayments().add(payment);
            totalPaid = totalPaid.add(amount);
        }

        if (totalPaid.compareTo(total) < 0) {
            throw new BusinessException(
                    String.format("Pagamento insuficiente. Total: R$ %s, Pago: R$ %s",
                            total.setScale(2), totalPaid.setScale(2)),
                    HttpStatus.BAD_REQUEST);
        }

        Sale saved = saleRepository.saveAndFlush(sale);
        // A cobranca so pode ser fechada para reuso depois que a venda existe.
        terminalPayments.forEach(t -> terminalPaymentService.linkToSale(t, saved));
        // Refresh to load DB-generated sale_number (SERIAL)
        entityManager.refresh(saved);
        log.info("Venda #{} realizada: R$ {}", saved.getSaleNumber(), total);

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

    @Transactional(readOnly = true)
    public BigDecimal getFilteredTotal(String status, LocalDateTime start, LocalDateTime end) {
        return saleRepository.sumTotalWithFilters(status, start, end);
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
                product.setCurrentStock(product.getCurrentStock().add(item.getQuantity()));
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
                product.setCurrentStock(product.getCurrentStock().add(item.getQuantity()));
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

            if (product.getCurrentStock().compareTo(itemReq.getQuantity()) < 0) {
                throw new BusinessException(
                        String.format("Estoque insuficiente para '%s'. Disponível: %s",
                                product.getName(), product.getCurrentStock()),
                        HttpStatus.BAD_REQUEST);
            }

            BigDecimal itemDiscount = itemReq.getDiscount() != null ? itemReq.getDiscount() : BigDecimal.ZERO;
            BigDecimal itemTotal = money(product.getSalePrice()
                    .multiply(itemReq.getQuantity())
                    .subtract(itemDiscount));

            SaleItem item = SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .productName(product.getName())
                    .quantity(itemReq.getQuantity())
                    .unitPrice(product.getSalePrice())
                    .unitCost(product.getCostPrice())
                    .discount(itemDiscount)
                    .totalPrice(itemTotal)
                    .unit(product.getUnit())
                    .build();

            sale.getItems().add(item);
            subtotal = subtotal.add(itemTotal);

            product.setCurrentStock(product.getCurrentStock().subtract(itemReq.getQuantity()));
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
        discountAmount = money(discountAmount);
        sale.setDiscountAmount(discountAmount);

        BigDecimal surcharge = money(request.getSurcharge() != null ? request.getSurcharge() : BigDecimal.ZERO);
        sale.setSurcharge(surcharge);

        BigDecimal total = money(subtotal.subtract(discountAmount).add(surcharge));
        sale.setTotal(total);

        // 5. Process new payments
        List<TerminalPayment> terminalPayments = new ArrayList<>();
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

            // A venda ja existe: a cobranca que ja era dela continua valendo.
            TerminalPayment terminal = applyTerminalPayment(
                    payment, payReq, payReq.getAmount(), sale.getId());
            if (terminal != null) terminalPayments.add(terminal);

            sale.getPayments().add(payment);
            totalPaid = totalPaid.add(payReq.getAmount());
        }

        sale.setNotes(request.getNotes());
        Sale saved = saleRepository.save(sale);
        terminalPayments.forEach(t -> terminalPaymentService.linkToSale(t, saved));
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

    /**
     * Copia os dados da transacao aprovada na maquininha para o pagamento da venda.
     * Validar aqui impede que o PDV registre como pago um cartao que foi recusado,
     * ou que a mesma autorizacao seja usada em duas vendas.
     */
    private TerminalPayment applyTerminalPayment(SalePayment payment,
                                                 CreateSaleRequest.SalePaymentRequest payReq,
                                                 BigDecimal amount,
                                                 UUID saleId) {
        if (payReq.getTerminalPaymentId() == null) return null;

        TerminalPayment terminal = terminalPaymentService
                .requireApproved(payReq.getTerminalPaymentId(), amount, saleId);

        payment.setTerminalPayment(terminal);
        payment.setNsu(terminal.getNsu());
        payment.setAuthorizationCode(terminal.getAuthorizationCode());
        payment.setCardBrand(terminal.getCardBrand());
        payment.setCardLast4(terminal.getCardLast4());
        if (payment.getReference() == null || payment.getReference().isBlank()) {
            payment.setReference(terminal.getNsu());
        }
        return terminal;
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
                                .productSku(i.getProduct().getSku())
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
