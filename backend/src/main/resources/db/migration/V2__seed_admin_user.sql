-- =============================================
-- StorePro - Migration V2: Seed Admin User
-- Password: admin123 (BCrypt encoded)
-- =============================================

INSERT INTO users (id, name, email, password, role, active, created_at, created_by)
VALUES (
    gen_random_uuid(),
    'Administrador',
    'admin@storepro.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'ADMIN',
    TRUE,
    CURRENT_TIMESTAMP,
    'SYSTEM'
) ON CONFLICT (email) DO NOTHING;
