-- =============================================
-- DanJu - Migration V8: Cleanup test data from 2026-07-10
-- Removes all test sales, products, categories created before 2026-07-17
-- =============================================

-- 1. Remove sale items from test sales
DELETE FROM sale_items WHERE sale_id IN (
    SELECT id FROM sales WHERE created_at < '2026-07-17 00:00:00'
);

-- 2. Remove sale payments from test sales
DELETE FROM sale_payments WHERE sale_id IN (
    SELECT id FROM sales WHERE created_at < '2026-07-17 00:00:00'
);

-- 3. Remove test sales
DELETE FROM sales WHERE created_at < '2026-07-17 00:00:00';

-- 4. Remove inventory movements from test period
DELETE FROM inventory_movements WHERE created_at < '2026-07-17 00:00:00';

-- 5. Remove test products
DELETE FROM products WHERE created_at < '2026-07-17 00:00:00';

-- 6. Remove test categories (only empty ones to avoid FK issues)
DELETE FROM categories WHERE created_at < '2026-07-17 00:00:00'
  AND id NOT IN (SELECT DISTINCT category_id FROM products WHERE category_id IS NOT NULL);

-- 7. Remove test suppliers (only unused ones)
DELETE FROM suppliers WHERE created_at < '2026-07-17 00:00:00'
  AND id NOT IN (SELECT DISTINCT supplier_id FROM products WHERE supplier_id IS NOT NULL);
