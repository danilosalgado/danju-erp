-- =============================================
-- StorePro - Migration V4: Suppliers Table
-- =============================================

CREATE TABLE IF NOT EXISTS suppliers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name        VARCHAR(200) NOT NULL,
    trade_name          VARCHAR(200),
    cnpj                VARCHAR(18) UNIQUE,
    state_registration  VARCHAR(30),
    zip_code            VARCHAR(10),
    street              VARCHAR(200),
    number              VARCHAR(20),
    complement          VARCHAR(100),
    neighborhood        VARCHAR(100),
    city                VARCHAR(100),
    state               VARCHAR(2),
    phone               VARCHAR(20),
    phone2              VARCHAR(20),
    email               VARCHAR(255),
    contact_person      VARCHAR(150),
    notes               TEXT,
    active              BOOLEAN NOT NULL DEFAULT TRUE,
    avg_delivery_days   INTEGER DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP,
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255)
);

CREATE INDEX idx_suppliers_cnpj ON suppliers(cnpj);
CREATE INDEX idx_suppliers_active ON suppliers(active);
CREATE INDEX idx_suppliers_company_name ON suppliers(company_name);
