-- =============================================
-- DanJu - Migration V13: Change stock columns to DECIMAL for fractional quantities
-- Supports quantities like 4.4kg, 0.5L, etc.
-- =============================================

ALTER TABLE products ALTER COLUMN current_stock TYPE DECIMAL(10,3) USING current_stock::DECIMAL(10,3);
ALTER TABLE products ALTER COLUMN min_stock TYPE DECIMAL(10,3) USING min_stock::DECIMAL(10,3);
ALTER TABLE sale_items ALTER COLUMN quantity TYPE DECIMAL(10,3) USING quantity::DECIMAL(10,3);
