import React from 'react';

export interface SaleReceiptData {
  saleNumber: number | null;
  customerName?: string | null;
  userName?: string | null;
  subtotal: number;
  discountAmount?: number | null;
  surcharge?: number | null;
  total: number;
  items: {
    productName: string;
    productSku?: string | null;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  payments: { method: string; amount: number; changeAmount?: number | null }[];
  createdAt: string;
}

export const STORE_INFO = {
  name: 'DanJu Pescados & Empório',
  phone: '(79) 99649-4745',
  address: 'R. Cel. José F de Albuquerque, 2360 - Atalaia, Aracaju - SE, 49035-190',
  cnpj: '63.387.222/0001-29',
};

export const paymentMethodLabels: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  PIX: 'PIX',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatBrasiliaDateOnly = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

interface SaleReceiptProps {
  sale: SaleReceiptData;
}

const SaleReceipt: React.FC<SaleReceiptProps> = ({ sale }) => {
  const totalPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalChange = sale.payments.reduce((sum, p) => sum + (p.changeAmount || 0), 0);
  const paymentLabel = sale.payments
    .map(p => paymentMethodLabels[p.method] || p.method.replace(/_/g, ' '))
    .join(' + ');
  const now = new Date();

  return (
    <div className="receipt" id="receipt">
      <div className="receipt-center">
        <img src="/logo.png" alt="" className="receipt-logo" />
        <div className="receipt-store-name">{STORE_INFO.name}</div>
        <div className="receipt-muted">Fone: {STORE_INFO.phone}</div>
        <div className="receipt-muted">{STORE_INFO.address}</div>
        <div className="receipt-muted">CNPJ: {STORE_INFO.cnpj}</div>
      </div>
      <hr className="receipt-divider" />
      <div className="receipt-line receipt-muted">
        <span>Emissão: {formatBrasiliaDateOnly(sale.createdAt)}</span>
        <span>Venda: {formatBrasiliaDateOnly(sale.createdAt)}</span>
      </div>
      <div className="receipt-line receipt-muted">
        <span>Impressão: {now.toLocaleString('pt-BR')}</span>
      </div>
      <div className="receipt-line" style={{ fontWeight: 700, marginTop: 4 }}>
        <span>PEDIDO N.: {sale.saleNumber ?? '—'}</span>
      </div>
      <hr className="receipt-divider" />

      <table className="receipt-table">
        <thead>
          <tr>
            <th style={{ width: 50 }}>Cod.</th>
            <th>Descrição</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item, i) => (
            <React.Fragment key={i}>
              <tr>
                <td className="receipt-item-desc">{item.productSku || '—'}</td>
                <td className="receipt-item-desc">{item.productName}</td>
              </tr>
              <tr>
                <td className="receipt-item-detail">{item.unit}</td>
                <td className="receipt-item-detail">
                  {item.quantity} × {formatCurrency(item.unitPrice)} = {formatCurrency(item.totalPrice)}
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
      <hr className="receipt-divider" />

      <div className="receipt-line" style={{ fontWeight: 700 }}>
        <span>Forma</span>
        <span>Valor</span>
      </div>
      <div className="receipt-line">
        <span>{paymentLabel}</span>
        <span>{formatCurrency(totalPaid)}</span>
      </div>
      <hr className="receipt-divider" />

      <div className="receipt-totals-row">
        <span>Sub Total:</span>
        <span>{formatCurrency(sale.subtotal)}</span>
      </div>
      <div className="receipt-totals-row">
        <span>Desconto/Acréscimo:</span>
        <span>{formatCurrency((sale.surcharge || 0) - (sale.discountAmount || 0))}</span>
      </div>
      <div className="receipt-totals-row grand">
        <span>TOTAL GERAL:</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>
      <div className="receipt-totals-row">
        <span>Total Pago:</span>
        <span>{formatCurrency(totalPaid)}</span>
      </div>
      {totalChange > 0 && (
        <div className="receipt-totals-row">
          <span>Troco:</span>
          <span>{formatCurrency(totalChange)}</span>
        </div>
      )}

      <hr className="receipt-divider" />
      <div className="receipt-line receipt-muted">
        <span>Vendedor:</span>
        <span>{sale.userName || '—'}</span>
      </div>
      <div className="receipt-line receipt-muted">
        <span>Cliente:</span>
        <span>{sale.customerName || 'Consumidor'}</span>
      </div>

      <div className="receipt-signature">Ass: ___________________________</div>
      <div className="receipt-disclaimer">NÃO É DOCUMENTO FISCAL</div>
    </div>
  );
};

export default SaleReceipt;
