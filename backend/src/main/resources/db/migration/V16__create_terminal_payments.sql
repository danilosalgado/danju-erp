-- =============================================
-- DanJu - Migration V16: Pagamentos na maquininha (PagBank / Moderninha Smart)
--
-- O PDV roda no navegador e nao consegue falar com a maquininha direto: o SDK
-- oficial (PlugPag) so roda dentro do Android dela. Entao o ERP grava aqui a
-- "ordem de cobranca" e o app instalado na maquininha busca a proxima pendente,
-- executa a transacao e devolve o resultado. Esta tabela e a fila entre os dois.
-- =============================================

CREATE TABLE terminal_payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    terminal_id         VARCHAR(50) NOT NULL,
    amount              DECIMAL(12,2) NOT NULL,
    method              VARCHAR(20) NOT NULL,          -- CARTAO_CREDITO, CARTAO_DEBITO, PIX, VOUCHER
    installments        INTEGER NOT NULL DEFAULT 1,
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
                                                       -- PENDENTE, ENVIADO, APROVADO, RECUSADO, CANCELADO, EXPIRADO
    provider            VARCHAR(20) NOT NULL DEFAULT 'PAGBANK',

    -- Retorno da transacao
    nsu                 VARCHAR(50),
    authorization_code  VARCHAR(50),
    transaction_code    VARCHAR(100),
    card_brand          VARCHAR(30),
    card_last4          VARCHAR(4),
    receipt_customer    TEXT,
    receipt_merchant    TEXT,
    error_code          VARCHAR(20),
    error_message       VARCHAR(255),

    sale_id             UUID REFERENCES sales(id) ON DELETE SET NULL,
    user_id             UUID REFERENCES users(id),
    claimed_at          TIMESTAMP,
    finished_at         TIMESTAMP,
    expires_at          TIMESTAMP NOT NULL,

    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP,
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255)
);

-- O app da maquininha pergunta "tem cobranca pendente pra mim?" a cada segundo;
-- este indice e o que segura esse polling.
CREATE INDEX idx_terminal_payments_pending ON terminal_payments(terminal_id, status, created_at);
CREATE INDEX idx_terminal_payments_sale ON terminal_payments(sale_id);

-- Dados da transacao ficam tambem no pagamento da venda, para o comprovante e
-- para a conciliacao com o extrato do PagBank.
ALTER TABLE sale_payments ADD COLUMN nsu VARCHAR(50);
ALTER TABLE sale_payments ADD COLUMN authorization_code VARCHAR(50);
ALTER TABLE sale_payments ADD COLUMN card_brand VARCHAR(30);
ALTER TABLE sale_payments ADD COLUMN card_last4 VARCHAR(4);
ALTER TABLE sale_payments ADD COLUMN terminal_payment_id UUID REFERENCES terminal_payments(id) ON DELETE SET NULL;
