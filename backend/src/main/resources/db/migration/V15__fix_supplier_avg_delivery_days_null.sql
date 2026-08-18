-- =============================================
-- DanJu - Migration V15: Fix suppliers.avg_delivery_days
-- The column allowed NULL while the Java entity mapped it to a
-- primitive int, so any supplier row with NULL there crashed every
-- read (GET /suppliers) with a 500 error.
-- =============================================

UPDATE suppliers SET avg_delivery_days = 0 WHERE avg_delivery_days IS NULL;

ALTER TABLE suppliers ALTER COLUMN avg_delivery_days SET DEFAULT 0;
ALTER TABLE suppliers ALTER COLUMN avg_delivery_days SET NOT NULL;
