-- =============================================
-- StorePro - Migration V3: Categories Table
-- Self-referencing hierarchy (parent_id)
-- =============================================

CREATE TABLE IF NOT EXISTS categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(500),
    parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_active ON categories(active);
