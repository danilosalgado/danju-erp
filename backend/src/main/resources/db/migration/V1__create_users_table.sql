-- =============================================
-- StorePro - Migration V1: Users Table
-- =============================================

CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password        VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            VARCHAR(20) NOT NULL DEFAULT 'CAIXA',
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    password_reset_token VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);
