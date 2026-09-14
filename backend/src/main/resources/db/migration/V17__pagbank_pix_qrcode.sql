-- =============================================
-- DanJu - Migration V17: PIX com QR Code pela API do PagBank
--
-- Diferente da maquininha (V16), aqui nao existe fila: o ERP chama a API do
-- PagBank na hora, recebe o QR Code e mostra na tela do PDV. O cliente paga pelo
-- banco dele e o PagBank avisa por webhook. Reaproveita terminal_payments para o
-- PDV ter um unico jeito de acompanhar "estou esperando um pagamento".
--
-- O provider distingue os dois caminhos:
--   PAGBANK      -> fila da maquininha (app Android / PlugPag)
--   PAGBANK_API  -> QR Code PIX gerado pela API REST
-- =============================================

ALTER TABLE terminal_payments ADD COLUMN provider_order_id VARCHAR(100);
ALTER TABLE terminal_payments ADD COLUMN qr_code_id VARCHAR(100);
ALTER TABLE terminal_payments ADD COLUMN qr_code_text TEXT;
ALTER TABLE terminal_payments ADD COLUMN qr_code_image_url VARCHAR(500);

-- CPF/CNPJ enviado como pagador. O PagBank recusa a cobranca sem um documento
-- valido, entao o PDV manda o CPF do cliente da venda quando existe, e cai no
-- documento da loja quando a venda e de balcao sem cadastro.
ALTER TABLE terminal_payments ADD COLUMN payer_tax_id VARCHAR(20);

-- O webhook chega identificando o pedido pelo id do PagBank, nao pelo nosso.
CREATE INDEX idx_terminal_payments_provider_order ON terminal_payments(provider_order_id);
