-- =============================================
-- DanJu - Migration V10: Add updated_by to expenses
-- Fixes missing audit column required by BaseEntity
-- =============================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
