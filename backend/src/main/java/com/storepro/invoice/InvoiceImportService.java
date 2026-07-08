package com.storepro.invoice;

import com.storepro.invoice.dto.NFeImportResult;
import com.storepro.product.entity.Product;
import com.storepro.product.repository.ProductRepository;
import com.storepro.supplier.entity.Supplier;
import com.storepro.supplier.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceImportService {

    private final ProductRepository productRepository;
    private final SupplierRepository supplierRepository;

    @Transactional
    public NFeImportResult importNFe(MultipartFile file) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            DocumentBuilder builder = factory.newDocumentBuilder();
            Document doc = builder.parse(file.getInputStream());
            doc.getDocumentElement().normalize();

            String ns = "http://www.portalfiscal.inf.br/nfe";

            // Extract invoice number
            String invoiceNumber = getTagValue(doc, ns, "nNF");

            // Extract supplier (emit)
            Element emit = (Element) doc.getElementsByTagNameNS(ns, "emit").item(0);
            String supplierName = emit != null ? getTagValue(emit, ns, "xNome") : "Desconhecido";
            String supplierCnpj = emit != null ? getTagValue(emit, ns, "CNPJ") : "";

            // Find or create supplier
            Supplier supplier = findOrCreateSupplier(emit, ns, supplierCnpj, supplierName);

            // Extract total
            BigDecimal totalValue = BigDecimal.ZERO;
            Element total = (Element) doc.getElementsByTagNameNS(ns, "total").item(0);
            if (total != null) {
                Element icmsTot = (Element) total.getElementsByTagNameNS(ns, "ICMSTot").item(0);
                if (icmsTot != null) {
                    String vNF = getTagValue(icmsTot, ns, "vNF");
                    if (vNF != null) totalValue = new BigDecimal(vNF);
                }
            }

            // Process products (det elements)
            NodeList detList = doc.getElementsByTagNameNS(ns, "det");
            List<NFeImportResult.NFeProduct> products = new ArrayList<>();
            int created = 0, updated = 0, errors = 0;

            for (int i = 0; i < detList.getLength(); i++) {
                Element det = (Element) detList.item(i);
                Element prod = (Element) det.getElementsByTagNameNS(ns, "prod").item(0);
                if (prod == null) continue;

                try {
                    NFeImportResult.NFeProduct result = processProduct(prod, ns, supplier);
                    products.add(result);
                    switch (result.getStatus()) {
                        case "CREATED" -> created++;
                        case "UPDATED" -> updated++;
                        case "ERROR" -> errors++;
                    }
                } catch (Exception e) {
                    log.error("Error processing product at index {}: {}", i, e.getMessage());
                    errors++;
                    products.add(NFeImportResult.NFeProduct.builder()
                            .name("Erro no item " + (i + 1))
                            .status("ERROR")
                            .message(e.getMessage())
                            .build());
                }
            }

            log.info("NF-e {} imported: {} created, {} updated, {} errors",
                    invoiceNumber, created, updated, errors);

            return NFeImportResult.builder()
                    .supplierName(supplierName)
                    .supplierCnpj(formatCnpj(supplierCnpj))
                    .invoiceNumber(invoiceNumber != null ? invoiceNumber : "N/A")
                    .totalValue(totalValue)
                    .products(products)
                    .totalCreated(created)
                    .totalUpdated(updated)
                    .totalErrors(errors)
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse NF-e XML: {}", e.getMessage(), e);
            throw new RuntimeException("Erro ao processar XML da NF-e: " + e.getMessage());
        }
    }

    private NFeImportResult.NFeProduct processProduct(Element prod, String ns, Supplier supplier) {
        String code = getTagValue(prod, ns, "cProd");
        String barcode = getTagValue(prod, ns, "cEAN");
        String name = getTagValue(prod, ns, "xProd");
        String ncm = getTagValue(prod, ns, "NCM");
        String unit = getTagValue(prod, ns, "uCom");
        String qComStr = getTagValue(prod, ns, "qCom");
        String vUnComStr = getTagValue(prod, ns, "vUnCom");
        String vProdStr = getTagValue(prod, ns, "vProd");

        int quantity = qComStr != null ? (int) Double.parseDouble(qComStr) : 0;
        BigDecimal unitPrice = vUnComStr != null ? new BigDecimal(vUnComStr) : BigDecimal.ZERO;
        BigDecimal totalPrice = vProdStr != null ? new BigDecimal(vProdStr) : BigDecimal.ZERO;

        // Clean barcode (SEM GTIN = no barcode)
        if (barcode != null && (barcode.equals("SEM GTIN") || barcode.isBlank())) {
            barcode = null;
        }

        // Find existing product by barcode or code
        Optional<Product> existing = Optional.empty();
        if (barcode != null) {
            existing = productRepository.findByBarcode(barcode);
        }

        String status;
        String message;

        if (existing.isPresent()) {
            // Update existing product
            Product product = existing.get();
            product.setCostPrice(unitPrice);
            product.setCurrentStock(product.getCurrentStock() + quantity);
            if (supplier != null) product.setSupplier(supplier);
            productRepository.save(product);
            status = "UPDATED";
            message = "Estoque atualizado: +" + quantity + " unidades";
        } else {
            // Create new product
            String sku = "NFE-" + (code != null ? code : System.currentTimeMillis());
            // Ensure SKU is unique
            if (productRepository.existsBySku(sku)) {
                sku = sku + "-" + System.currentTimeMillis();
            }

            Product product = Product.builder()
                    .name(name != null ? name : "Produto s/ nome")
                    .sku(sku)
                    .barcode(barcode)
                    .internalCode(code)
                    .unit(unit != null ? unit : "UN")
                    .costPrice(unitPrice)
                    .salePrice(unitPrice.multiply(BigDecimal.valueOf(1.3)).setScale(2, java.math.RoundingMode.HALF_UP))
                    .currentStock(quantity)
                    .minStock(5)
                    .supplier(supplier)
                    .active(true)
                    .build();
            product.setCreatedBy("NF-e Import");
            productRepository.save(product);
            status = "CREATED";
            message = "Produto criado com margem de 30%";
        }

        return NFeImportResult.NFeProduct.builder()
                .code(code)
                .barcode(barcode)
                .name(name)
                .ncm(ncm)
                .unit(unit)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .totalPrice(totalPrice)
                .status(status)
                .message(message)
                .build();
    }

    private Supplier findOrCreateSupplier(Element emit, String ns, String cnpj, String name) {
        if (cnpj == null || cnpj.isBlank()) return null;

        return supplierRepository.findByCnpj(formatCnpj(cnpj))
                .orElseGet(() -> {
                    Supplier s = Supplier.builder()
                            .companyName(name)
                            .tradeName(emit != null ? getTagValue(emit, ns, "xFant") : name)
                            .cnpj(formatCnpj(cnpj))
                            .active(true)
                            .build();

                    // Try to get address
                    if (emit != null) {
                        Element addr = (Element) emit.getElementsByTagNameNS(ns, "enderEmit").item(0);
                        if (addr != null) {
                            s.setStreet(getTagValue(addr, ns, "xLgr"));
                            s.setNumber(getTagValue(addr, ns, "nro"));
                            s.setNeighborhood(getTagValue(addr, ns, "xBairro"));
                            s.setCity(getTagValue(addr, ns, "xMun"));
                            s.setState(getTagValue(addr, ns, "UF"));
                            s.setZipCode(getTagValue(addr, ns, "CEP"));
                        }
                    }

                    s.setCreatedBy("NF-e Import");
                    log.info("Created supplier from NF-e: {} ({})", name, formatCnpj(cnpj));
                    return supplierRepository.save(s);
                });
    }

    private String getTagValue(Document doc, String ns, String tag) {
        NodeList list = doc.getElementsByTagNameNS(ns, tag);
        return list.getLength() > 0 ? list.item(0).getTextContent() : null;
    }

    private String getTagValue(Element element, String ns, String tag) {
        NodeList list = element.getElementsByTagNameNS(ns, tag);
        return list.getLength() > 0 ? list.item(0).getTextContent() : null;
    }

    private String formatCnpj(String cnpj) {
        if (cnpj == null || cnpj.length() != 14) return cnpj;
        return cnpj.substring(0, 2) + "." + cnpj.substring(2, 5) + "." +
               cnpj.substring(5, 8) + "/" + cnpj.substring(8, 12) + "-" + cnpj.substring(12);
    }
}
