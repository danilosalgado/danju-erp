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
        product.setActive(false);
        productRepository.save(product);
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
                .lowStock(p.getCurrentStock() <= p.getMinStock())
                .createdAt(p.getCreatedAt())
                .updatedAt(p.getUpdatedAt())
                .build();
    }
}
