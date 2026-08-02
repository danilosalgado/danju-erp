package com.storepro.product.service;

import com.storepro.category.entity.Category;
import com.storepro.category.repository.CategoryRepository;
import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.product.dto.CreateProductRequest;
import com.storepro.product.dto.ProductResponse;
import com.storepro.product.dto.UpdateProductRequest;
import com.storepro.product.entity.Product;
import com.storepro.product.repository.ProductRepository;
import com.storepro.supplier.entity.Supplier;
import com.storepro.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;

    @Transactional
    public ProductResponse create(CreateProductRequest request) {
        if (request.getSku() != null && !request.getSku().isBlank()
                && productRepository.existsBySku(request.getSku())) {
            throw new BusinessException("SKU já cadastrado", HttpStatus.CONFLICT);
        }

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria", "id", request.getCategoryId()));
        }

        Supplier supplier = null;
        if (request.getSupplierId() != null) {
            supplier = supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", "id", request.getSupplierId()));
        }

        Product product = Product.builder()
                .name(request.getName())
                .internalCode(request.getInternalCode())
                .sku(request.getSku())
                .barcode(request.getBarcode())
                .description(request.getDescription())
                .category(category)
                .supplier(supplier)
                .brand(request.getBrand())
                .unit(request.getUnit() != null ? request.getUnit() : "UN")
                .costPrice(request.getCostPrice())
                .salePrice(request.getSalePrice())
                .weight(request.getWeight())
                .width(request.getWidth())
                .height(request.getHeight())
                .depth(request.getDepth())
                .minStock(request.getMinStock())
                .currentStock(request.getCurrentStock())
                .stockLocation(request.getStockLocation())
                .active(true)
                .build();

        return toResponse(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public ProductResponse getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public ProductResponse getByBarcode(String barcode) {
        return toResponse(productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Produto", "código de barras", barcode)));
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> list(String search, UUID categoryId, UUID supplierId,
                                               Boolean active, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by("name"));
        Page<Product> productPage = productRepository.findWithFilters(search, categoryId, supplierId, active, pageRequest);

        return PageResponse.of(
                productPage.getContent().stream().map(this::toResponse).toList(),
                page, size, productPage.getTotalElements()
        );
    }

    @Transactional(readOnly = true)
    public List<ProductResponse> getLowStock() {
        return productRepository.findLowStock().stream().map(this::toResponse).toList();
    }

    @Transactional
    public ProductResponse update(UUID id, UpdateProductRequest request) {
        Product product = findById(id);

        if (request.getName() != null) product.setName(request.getName());
        if (request.getInternalCode() != null) product.setInternalCode(request.getInternalCode());
        if (request.getSku() != null) {
            if (!request.getSku().equals(product.getSku()) && productRepository.existsBySku(request.getSku())) {
                throw new BusinessException("SKU já cadastrado", HttpStatus.CONFLICT);
            }
            product.setSku(request.getSku());
        }
        if (request.getBarcode() != null) product.setBarcode(request.getBarcode());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getCategoryId() != null) {
            product.setCategory(categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Categoria", "id", request.getCategoryId())));
        }
        if (request.getSupplierId() != null) {
            product.setSupplier(supplierRepository.findById(request.getSupplierId())
                    .orElseThrow(() -> new ResourceNotFoundException("Fornecedor", "id", request.getSupplierId())));
        }
        if (request.getBrand() != null) product.setBrand(request.getBrand());
        if (request.getUnit() != null) product.setUnit(request.getUnit());
        if (request.getCostPrice() != null) product.setCostPrice(request.getCostPrice());
        if (request.getSalePrice() != null) product.setSalePrice(request.getSalePrice());
        if (request.getWeight() != null) product.setWeight(request.getWeight());
        if (request.getWidth() != null) product.setWidth(request.getWidth());
        if (request.getHeight() != null) product.setHeight(request.getHeight());
        if (request.getDepth() != null) product.setDepth(request.getDepth());
        if (request.getMinStock() != null) product.setMinStock(request.getMinStock());
        if (request.getCurrentStock() != null) product.setCurrentStock(request.getCurrentStock());
        if (request.getStockLocation() != null) product.setStockLocation(request.getStockLocation());
        if (request.getActive() != null) product.setActive(request.getActive());

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public void delete(UUID id) {
        Product product = findById(id);
        try {
            productRepository.delete(product);
            productRepository.flush();
        } catch (Exception e) {
            // FK constraint (product was sold) — fallback to soft-delete
            product.setActive(false);
            productRepository.save(product);
        }
    }

    private Product findById(UUID id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produto", "id", id));
    }

    private ProductResponse toResponse(Product p) {
        return ProductResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .internalCode(p.getInternalCode())
                .sku(p.getSku())
                .barcode(p.getBarcode())
                .description(p.getDescription())
                .categoryId(p.getCategory() != null ? p.getCategory().getId() : null)
                .categoryName(p.getCategory() != null ? p.getCategory().getName() : null)
                .supplierId(p.getSupplier() != null ? p.getSupplier().getId() : null)
                .supplierName(p.getSupplier() != null ? p.getSupplier().getCompanyName() : null)
                .brand(p.getBrand())
                .unit(p.getUnit())
                .costPrice(p.getCostPrice())
                .salePrice(p.getSalePrice())
                .profitMargin(p.getProfitMargin())
                .weight(p.getWeight())
                .width(p.getWidth())
                .height(p.getHeight())
                .depth(p.getDepth())
                .minStock(p.getMinStock())
                .currentStock(p.getCurrentStock())
                .stockLocation(p.getStockLocation())
                .active(p.isActive())
                .lowStock(p.getCurrentStock().compareTo(p.getMinStock()) <= 0)
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> getInventorySummary() {
        List<Product> allProducts = productRepository.findAll();
        List<Product> activeProducts = allProducts.stream().filter(Product::isActive).toList();

        // Total stock value (cost and sale)
        java.math.BigDecimal totalCostValue = activeProducts.stream()
                .map(p -> p.getCostPrice().multiply(p.getCurrentStock()))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        java.math.BigDecimal totalSaleValue = activeProducts.stream()
                .map(p -> p.getSalePrice().multiply(p.getCurrentStock()))
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        // Counts
        long totalActive = activeProducts.size();
        long lowStock = activeProducts.stream()
                .filter(p -> p.getCurrentStock().compareTo(p.getMinStock()) <= 0
                        && p.getCurrentStock().compareTo(java.math.BigDecimal.ZERO) > 0)
                .count();
        long outOfStock = activeProducts.stream()
                .filter(p -> p.getCurrentStock().compareTo(java.math.BigDecimal.ZERO) <= 0)
                .count();
        long healthyStock = totalActive - lowStock - outOfStock;

        // Total items in stock
        java.math.BigDecimal totalItems = activeProducts.stream()
                .map(Product::getCurrentStock)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        // Top 5 most valuable products by stock value
        List<java.util.Map<String, Object>> topValueProducts = activeProducts.stream()
                .sorted((a, b) -> b.getSalePrice().multiply(b.getCurrentStock())
                        .compareTo(a.getSalePrice().multiply(a.getCurrentStock())))
                .limit(5)
                .map(p -> {
                    java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("name", p.getName());
                    m.put("currentStock", p.getCurrentStock());
                    m.put("unit", p.getUnit());
                    m.put("salePrice", p.getSalePrice());
                    m.put("stockValue", p.getSalePrice().multiply(p.getCurrentStock()));
                    return m;
                })
                .toList();

        // Category breakdown
        java.util.Map<String, java.util.Map<String, Object>> categoryMap = new java.util.LinkedHashMap<>();
        for (Product p : activeProducts) {
            String catName = p.getCategory() != null ? p.getCategory().getName() : "Sem Categoria";
            categoryMap.computeIfAbsent(catName, k -> {
                java.util.Map<String, Object> m = new java.util.LinkedHashMap<>();
                m.put("name", k);
                m.put("count", 0L);
                m.put("stockValue", java.math.BigDecimal.ZERO);
                return m;
            });
            java.util.Map<String, Object> cat = categoryMap.get(catName);
            cat.put("count", (Long) cat.get("count") + 1);
            cat.put("stockValue", ((java.math.BigDecimal) cat.get("stockValue"))
                    .add(p.getSalePrice().multiply(p.getCurrentStock())));
        }
        List<java.util.Map<String, Object>> categories = new java.util.ArrayList<>(categoryMap.values());
        categories.sort((a, b) -> ((java.math.BigDecimal) b.get("stockValue"))
                .compareTo((java.math.BigDecimal) a.get("stockValue")));

        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("totalCostValue", totalCostValue);
        result.put("totalSaleValue", totalSaleValue);
        result.put("totalActiveProducts", totalActive);
        result.put("totalItems", totalItems);
        result.put("healthyStock", healthyStock);
        result.put("lowStockCount", lowStock);
        result.put("outOfStockCount", outOfStock);
        result.put("topValueProducts", topValueProducts);
        result.put("categories", categories);

        return result;
    }
}
