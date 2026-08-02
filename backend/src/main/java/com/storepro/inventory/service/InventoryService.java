package com.storepro.inventory.service;

import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.inventory.dto.CreateMovementRequest;
import com.storepro.inventory.dto.MovementResponse;
import com.storepro.inventory.entity.InventoryMovement;
import com.storepro.inventory.entity.MovementType;
import com.storepro.inventory.repository.InventoryMovementRepository;
import com.storepro.product.entity.Product;
import com.storepro.product.repository.ProductRepository;
import com.storepro.user.entity.User;
import com.storepro.user.repository.UserRepository;
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
import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InventoryService {

    private final InventoryMovementRepository movementRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Transactional
    public MovementResponse createMovement(CreateMovementRequest request) {
        Product product = productRepository.findById(request.getProductId())
                .orElseThrow(() -> new ResourceNotFoundException("Produto", "id", request.getProductId()));

        BigDecimal previousStock = product.getCurrentStock();
        BigDecimal newStock = calculateNewStock(previousStock, request.getType(), request.getQuantity());

        if (newStock.compareTo(java.math.BigDecimal.ZERO) < 0) {
            throw new BusinessException("Estoque insuficiente. Estoque atual: " + previousStock, HttpStatus.BAD_REQUEST);
        }

        User currentUser = getCurrentUser();

        InventoryMovement movement = InventoryMovement.builder()
                .product(product)
                .type(request.getType())
                .quantity(request.getQuantity())
                .previousStock(previousStock)
                .newStock(newStock)
                .unitCost(request.getUnitCost())
                .reason(request.getReason())
                .lotNumber(request.getLotNumber())
                .expiryDate(request.getExpiryDate())
                .serialNumber(request.getSerialNumber())
                .user(currentUser)
                .build();

        // Update product stock
        product.setCurrentStock(newStock);

        // Update cost price if it's an entry movement with unit cost
        if (request.getType() == MovementType.ENTRADA && request.getUnitCost() != null) {
            // Weighted average cost
            var totalOldValue = product.getCostPrice().multiply(previousStock);
            var totalNewValue = request.getUnitCost().multiply(request.getQuantity());
            if (newStock.compareTo(java.math.BigDecimal.ZERO) > 0) {
                product.setCostPrice(
                    totalOldValue.add(totalNewValue)
                        .divide(newStock, 2, java.math.RoundingMode.HALF_UP)
                );
            }
        }

        productRepository.save(product);
        InventoryMovement saved = movementRepository.save(movement);

        log.info("Movimentação de estoque: {} {} unidades de {} ({}→{})",
                request.getType(), request.getQuantity(), product.getName(), previousStock, newStock);

        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public PageResponse<MovementResponse> list(UUID productId, MovementType type,
                                                LocalDateTime startDate, LocalDateTime endDate,
                                                int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<InventoryMovement> movementPage = movementRepository.findWithFilters(
                productId, type, startDate, endDate, pageRequest);

        return PageResponse.of(
                movementPage.getContent().stream().map(this::toResponse).toList(),
                page, size, movementPage.getTotalElements()
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<MovementResponse> getProductHistory(UUID productId, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size);
        Page<InventoryMovement> movementPage = movementRepository.findByProductIdOrderByCreatedAtDesc(productId, pageRequest);

        return PageResponse.of(
                movementPage.getContent().stream().map(this::toResponse).toList(),
                page, size, movementPage.getTotalElements()
        );
    }

    private BigDecimal calculateNewStock(BigDecimal currentStock, MovementType type, BigDecimal quantity) {
        return switch (type) {
            case ENTRADA -> currentStock.add(quantity);
            case SAIDA -> currentStock.subtract(quantity);
            case AJUSTE, INVENTARIO -> quantity; // absolute value
            case TRANSFERENCIA -> currentStock.subtract(quantity);
        };
    }

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof User user) {
            return user;
        }
        return null;
    }

    private MovementResponse toResponse(InventoryMovement m) {
        return MovementResponse.builder()
                .id(m.getId())
                .productId(m.getProduct().getId())
                .productName(m.getProduct().getName())
                .productSku(m.getProduct().getSku())
                .type(m.getType())
                .quantity(m.getQuantity())
                .previousStock(m.getPreviousStock())
                .newStock(m.getNewStock())
                .unitCost(m.getUnitCost())
                .reason(m.getReason())
                .lotNumber(m.getLotNumber())
                .expiryDate(m.getExpiryDate())
                .serialNumber(m.getSerialNumber())
                .userName(m.getUser() != null ? m.getUser().getName() : null)
                .createdAt(m.getCreatedAt())
                .build();
    }
}
