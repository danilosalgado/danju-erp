-- =============================================
-- DanJu - Migration V14: Change inventory movement stock columns to DECIMAL
-- Supports quantities like 4.4kg, 0.5L, etc.
-- =============================================

ALTER TABLE inventory_movements ALTER COLUMN quantity TYPE DECIMAL(10,3) USING quantity::DECIMAL(10,3);
ALTER TABLE inventory_movements ALTER COLUMN previous_stock TYPE DECIMAL(10,3) USING previous_stock::DECIMAL(10,3);
ALTER TABLE inventory_movements ALTER COLUMN new_stock TYPE DECIMAL(10,3) USING new_stock::DECIMAL(10,3);
