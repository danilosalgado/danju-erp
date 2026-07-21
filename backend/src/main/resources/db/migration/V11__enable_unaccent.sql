-- =============================================
-- DanJu - Migration V11: Enable unaccent extension
-- Enables accent-insensitive search across all text queries
-- =============================================

CREATE EXTENSION IF NOT EXISTS unaccent;
