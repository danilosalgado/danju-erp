-- =============================================
-- DanJu - Migration V7: Support fractional quantities in sales
-- Allows products sold by weight (KG) or volume (L) to have decimal quantities
-- =============================================

-- Change quantity column from INTEGER to DECIMAL to support fractional values (e.g., 1.2kg)
ALTER TABLE sale_items ALTER COLUMN quantity TYPE DECIMAL(10,3) USING quantity::DECIMAL(10,3);

-- Add unit column to sale_items to record the unit used at the time of sale
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'UN';
