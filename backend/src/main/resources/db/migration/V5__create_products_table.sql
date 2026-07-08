-- =============================================
-- StorePro - Migration V5: Products Table
-- =============================================

CREATE TABLE IF NOT EXISTS products (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR(200) NOT NULL,
    internal_code       VARCHAR(50),
    sku                 VARCHAR(50) UNIQUE,
    barcode             VARCHAR(50),
    description         TEXT,
    category_id         UUID REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id         UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    brand               VARCHAR(100),
    unit                VARCHAR(20) NOT NULL DEFAULT 'UN',
    cost_price          DECIMAL(12,2) NOT NULL DEFAULT 0,
    sale_price          DECIMAL(12,2) NOT NULL DEFAULT 0,
    profit_margin       DECIMAL(5,2) DEFAULT 0,
    weight              DECIMAL(8,3),
    width               DECIMAL(8,2),
    height              DECIMAL(8,2),
    depth               DECIMAL(8,2),
    min_stock           INTEGER NOT NULL DEFAULT 0,
    current_stock       INTEGER NOT NULL DEFAULT 0,
    stock_location      VARCHAR(100),
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP,
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255)
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_stock ON products(current_stock, min_stock);
