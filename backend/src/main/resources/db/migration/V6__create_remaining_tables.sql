-- =============================================
-- StorePro - Migration V6: Inventory Tables
-- =============================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id      UUID NOT NULL REFERENCES products(id),
    type            VARCHAR(20) NOT NULL, -- ENTRADA, SAIDA, TRANSFERENCIA, AJUSTE, INVENTARIO
    quantity         INTEGER NOT NULL,
    previous_stock  INTEGER NOT NULL DEFAULT 0,
    new_stock       INTEGER NOT NULL DEFAULT 0,
    unit_cost       DECIMAL(12,2),
    reason          VARCHAR(500),
    lot_number      VARCHAR(50),
    expiry_date     DATE,
    serial_number   VARCHAR(100),
    reference_id    UUID,
    reference_type  VARCHAR(30),
    user_id         UUID REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_inv_mov_product ON inventory_movements(product_id);
CREATE INDEX idx_inv_mov_type ON inventory_movements(type);
CREATE INDEX idx_inv_mov_created ON inventory_movements(created_at);
CREATE INDEX idx_inv_mov_lot ON inventory_movements(lot_number);

-- =============================================
-- Customers Table
-- =============================================

CREATE TABLE IF NOT EXISTS customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    cpf_cnpj        VARCHAR(18) UNIQUE,
    phone           VARCHAR(20),
    email           VARCHAR(255),
    birth_date      DATE,
    zip_code        VARCHAR(10),
    street          VARCHAR(200),
    number          VARCHAR(20),
    complement      VARCHAR(100),
    neighborhood    VARCHAR(100),
    city            VARCHAR(100),
    state           VARCHAR(2),
    loyalty_points  INTEGER NOT NULL DEFAULT 0,
    cashback_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    credit_limit    DECIMAL(12,2) NOT NULL DEFAULT 0,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_customers_cpf ON customers(cpf_cnpj);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_customers_active ON customers(active);

-- =============================================
-- Purchase Orders Table
-- =============================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    status          VARCHAR(30) NOT NULL DEFAULT 'ABERTO',
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes           TEXT,
    expected_date   DATE,
    received_date   TIMESTAMP,
    user_id         UUID REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS purchase_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    quantity        INTEGER NOT NULL,
    received_qty    INTEGER NOT NULL DEFAULT 0,
    unit_price      DECIMAL(12,2) NOT NULL,
    total_price     DECIMAL(12,2) NOT NULL
);

CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- =============================================
-- Sales Tables
-- =============================================

CREATE TABLE IF NOT EXISTS sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_number     SERIAL,
    customer_id     UUID REFERENCES customers(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_type   VARCHAR(10),
    discount_value  DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    surcharge       DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'FINALIZADA',
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS sale_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    product_name    VARCHAR(200) NOT NULL,
    quantity        INTEGER NOT NULL,
    unit_price      DECIMAL(12,2) NOT NULL,
    discount        DECIMAL(12,2) DEFAULT 0,
    total_price     DECIMAL(12,2) NOT NULL,
    cancelled       BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sale_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    method          VARCHAR(20) NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    change_amount   DECIMAL(12,2) DEFAULT 0,
    installments    INTEGER DEFAULT 1,
    reference       VARCHAR(100)
);

CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_user ON sales(user_id);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sales_created ON sales(created_at);

-- =============================================
-- Financial Tables
-- =============================================

CREATE TABLE IF NOT EXISTS accounts_payable (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description     VARCHAR(300) NOT NULL,
    category        VARCHAR(50),
    supplier_id     UUID REFERENCES suppliers(id),
    amount          DECIMAL(12,2) NOT NULL,
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    due_date        DATE NOT NULL,
    payment_date    DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    reference_id    UUID,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS accounts_receivable (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description     VARCHAR(300) NOT NULL,
    customer_id     UUID REFERENCES customers(id),
    sale_id         UUID REFERENCES sales(id),
    amount          DECIMAL(12,2) NOT NULL,
    received_amount DECIMAL(12,2) DEFAULT 0,
    due_date        DATE NOT NULL,
    receive_date    DATE,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    installment     INTEGER DEFAULT 1,
    total_installments INTEGER DEFAULT 1,
    notes           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_ap_due_date ON accounts_payable(due_date);
CREATE INDEX idx_ap_status ON accounts_payable(status);
CREATE INDEX idx_ar_due_date ON accounts_receivable(due_date);
CREATE INDEX idx_ar_status ON accounts_receivable(status);

-- =============================================
-- Audit Log Table
-- =============================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    user_email      VARCHAR(255),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID,
    operation       VARCHAR(20) NOT NULL,
    ip_address      VARCHAR(45),
    old_values      JSONB,
    new_values      JSONB,
    description     VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_operation ON audit_logs(operation);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
