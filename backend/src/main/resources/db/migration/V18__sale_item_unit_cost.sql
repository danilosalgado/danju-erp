-- =============================================
-- DanJu - Migration V18: Custo unitario no item de venda
-- Guarda o preco de compra do produto no momento da venda,
-- base para o calculo do CMV (Custo da Mercadoria Vendida).
-- =============================================

ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(12, 2) NOT NULL DEFAULT 0;

-- Vendas anteriores nao tinham o custo registrado: usa o custo atual do produto
-- como melhor aproximacao disponivel.
UPDATE sale_items si
SET unit_cost = p.cost_price
FROM products p
WHERE p.id = si.product_id;
