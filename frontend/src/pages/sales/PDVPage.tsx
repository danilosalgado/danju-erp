import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ShoppingCart, Printer, X, Check, Camera, Edit3, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse } from '../../types';
import BarcodeScanner from '../../components/BarcodeScanner';
import { usePDVStore } from '../../store/usePDVStore';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  salePrice: number;
  currentStock: number;
  unit: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface SaleResult {
  id: string;
  saleNumber: number;
  total: number;
  items: { productName: string; quantity: number; unitPrice: number; totalPrice: number }[];
  payments: { method: string; amount: number; changeAmount: number }[];
  createdAt: string;
}

interface PaymentEntry {
  method: string;
  amount: string;
}

const PAYMENT_METHODS = [
  { key: 'DINHEIRO', label: 'Dinheiro', icon: Banknote, color: '#06b6d4' },
  { key: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard, color: '#6366f1' },
  { key: 'CARTAO_DEBITO', label: 'Débito', icon: CreditCard, color: '#06b6d4' },
  { key: 'PIX', label: 'PIX', icon: Smartphone, color: '#8b5cf6' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const PDVPage: React.FC = () => {
  const { cart, addToCart: storeAddToCart, updateQuantity, setQuantity, setItemPrice, removeItem, clearCart } = usePDVStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([{ method: 'DINHEIRO', amount: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SaleResult | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const searchProducts = (query: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get<ApiResponse<{ content: Product[] }>>('/products', {
          params: { search: query, active: true, size: 10 },
        });
        setSearchResults(res.data.data.content);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const isWeightUnit = (unit: string) => ['KG', 'L', 'M'].includes(unit);

  const addToCart = (product: Product) => {
    storeAddToCart(product, isWeightUnit(product.unit));
    setSearchQuery('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity - i.discount, 0);
  const total = subtotal;

  // Payment helpers
  const totalPaid = paymentEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remaining = Math.max(0, total - totalPaid);
  const hasCash = paymentEntries.some(p => p.method === 'DINHEIRO');
  const cashTotal = paymentEntries.filter(p => p.method === 'DINHEIRO').reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const change = totalPaid > total && hasCash ? totalPaid - total : 0;

  const addPaymentEntry = () => {
    setPaymentEntries([...paymentEntries, { method: 'PIX', amount: '' }]);
  };

  const removePaymentEntry = (index: number) => {
    if (paymentEntries.length <= 1) return;
    setPaymentEntries(paymentEntries.filter((_, i) => i !== index));
  };

  const updatePaymentEntry = (index: number, field: keyof PaymentEntry, value: string) => {
    setPaymentEntries(paymentEntries.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const fillRemaining = (index: number) => {
    const othersPaid = paymentEntries.reduce((sum, p, i) => i !== index ? sum + (Number(p.amount) || 0) : sum, 0);
    const rem = Math.max(0, total - othersPaid);
    updatePaymentEntry(index, 'amount', rem.toFixed(2));
  };

  // Price editing
  const startEditPrice = (productId: string, currentPrice: number) => {
    setEditingPrice(productId);
    setEditPriceValue(String(currentPrice));
  };

  const confirmEditPrice = (productId: string) => {
    const newPrice = parseFloat(editPriceValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      setItemPrice(productId, newPrice);
    }
    setEditingPrice(null);
    setEditPriceValue('');
  };

  const cancelEditPrice = () => {
    setEditingPrice(null);
    setEditPriceValue('');
  };

  const finalizeSale = async () => {
    if (cart.length === 0) { toast.error('Adicione itens ao carrinho'); return; }

    const validPayments = paymentEntries.filter(p => Number(p.amount) > 0);
    if (validPayments.length === 0) { toast.error('Adicione pelo menos um pagamento'); return; }

    if (totalPaid < total) {
      toast.error(`Pagamento insuficiente. Faltam ${formatCurrency(remaining)}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          discount: i.product.salePrice * i.quantity - i.unitPrice * i.quantity, // discount = originalTotal - customTotal
        })),
        payments: validPayments.map(p => ({
          method: p.method,
          amount: Number(p.amount),
          installments: 1,
          reference: '',
        })),
      };
      const res = await api.post<ApiResponse<SaleResult>>('/sales', payload);
      setReceipt(res.data.data);
      clearCart();
      setShowPayment(false);
      setPaymentEntries([{ method: 'DINHEIRO', amount: '' }]);
      toast.success('Venda registrada com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar venda');
    } finally { setSubmitting(false); }
  };

  const printReceipt = () => {
    window.print();
  };

  const formatBrasiliaDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  };

  // Receipt Modal
  if (receipt) {
    return (
      <div className="card" style={{ maxWidth: 500, margin: '0 auto', padding: 32 }} id="receipt">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 28 }}>🐟</div>
          <h2 style={{ margin: '8px 0 4px' }}>DanJu Pescados & Empório</h2>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Comprovante de Venda</p>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Venda #{receipt.saleNumber ?? '—'} — {formatBrasiliaDate(receipt.createdAt)}
          </div>
        </div>
        <hr style={{ border: 'none', borderTop: '1px dashed var(--border-glass)', margin: '16px 0' }} />
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', paddingBottom: 8 }}>Item</th>
              <th style={{ textAlign: 'center', paddingBottom: 8 }}>Qtd</th>
              <th style={{ textAlign: 'right', paddingBottom: 8 }}>Valor</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: '4px 0' }}>{item.productName}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{formatCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <hr style={{ border: 'none', borderTop: '1px dashed var(--border-glass)', margin: '16px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700 }}>
          <span>TOTAL</span>
          <span style={{ color: 'var(--accent-400)' }}>{formatCurrency(receipt.total)}</span>
        </div>
        {receipt.payments.map((p, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
            <span>{p.method.replace(/_/g, ' ')}</span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {receipt.payments.some(p => p.changeAmount > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#06b6d4', marginTop: 8 }}>
            <span>TROCO</span>
            <span>{formatCurrency(receipt.payments.reduce((sum, p) => sum + (p.changeAmount || 0), 0))}</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={printReceipt}>
            <Printer size={16} /> Imprimir
          </button>
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setReceipt(null); searchRef.current?.focus(); }}>
            Nova Venda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>PDV — Ponto de Venda</h1>
          <p>Registrar venda de produtos</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20, minHeight: '70vh' }}>
        {/* Left: Product search + results */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  ref={searchRef}
                  className="form-input"
                  placeholder="Buscar por nome, SKU ou código de barras..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); searchProducts(e.target.value); }}
                  style={{ paddingLeft: 42, fontSize: 16, height: 52 }}
                />
              </div>
              <button
                className="btn btn-secondary"
                style={{ height: 52, width: 52, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowScanner(true)}
                title="Escanear código de barras"
              >
                <Camera size={22} />
              </button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th style={{ textAlign: 'right' }}>Preço</th>
                    <th style={{ textAlign: 'center' }}>Estoque</th>
                    <th style={{ textAlign: 'center', width: 80 }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-400)' }}>
                        {formatCurrency(p.salePrice)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${p.currentStock > 0 ? 'badge-success' : 'badge-danger'}`}>
                          {p.currentStock} {p.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => addToCart(p)}
                          disabled={p.currentStock <= 0}
                        >
                          <Plus size={14} /> Adicionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {searchQuery && searchResults.length === 0 && !searching && (
            <div className="card">
              <div className="empty-state">
                <p>Nenhum produto encontrado para "{searchQuery}"</p>
              </div>
            </div>
          )}

          {!searchQuery && cart.length === 0 && (
            <div className="card">
              <div className="empty-state" style={{ padding: '60px 20px' }}>
                <ShoppingCart size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
                <h3>Comece uma venda</h3>
                <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                  Busque um produto por nome, SKU ou código de barras
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Cart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content', position: 'sticky', top: 20 }}>
          <div className="card-header">
            <h3 className="card-title"><ShoppingCart size={18} /> Carrinho</h3>
            <span className="badge badge-info">{cart.length} itens</span>
          </div>

          {cart.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Carrinho vazio
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', maxHeight: '50vh' }}>
              {cart.map(item => (
                <div
                  key={item.product.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-glass)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      {editingPrice === item.product.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editPriceValue}
                            onChange={e => setEditPriceValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') confirmEditPrice(item.product.id);
                              if (e.key === 'Escape') cancelEditPrice();
                            }}
                            autoFocus
                            style={{
                              width: 70, textAlign: 'center', fontWeight: 600, fontSize: 12,
                              background: 'var(--bg-input)', border: '1px solid var(--accent-400)',
                              borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                              padding: '2px 4px',
                            }}
                          />
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ width: 20, height: 20, padding: 0, color: 'var(--accent-400)' }}
                            onClick={() => confirmEditPrice(item.product.id)}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ width: 20, height: 20, padding: 0 }}
                            onClick={cancelEditPrice}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span style={{ color: item.unitPrice !== item.product.salePrice ? '#f59e0b' : 'var(--accent-400)' }}>
                            {formatCurrency(item.unitPrice)}
                          </span>
                          /{item.product.unit} × {item.quantity}{item.product.unit !== 'UN' ? item.product.unit.toLowerCase() : ''}
                          <button
                            className="btn btn-ghost btn-icon"
                            style={{ width: 20, height: 20, padding: 0, opacity: 0.6 }}
                            onClick={() => startEditPrice(item.product.id, item.unitPrice)}
                            title="Editar preço"
                          >
                            <Edit3 size={11} />
                          </button>
                          {item.unitPrice !== item.product.salePrice && (
                            <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>
                              (desc.)
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {isWeightUnit(item.product.unit) ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        step="0.1"
                        min="0.001"
                        value={item.quantity || ''}
                        onChange={e => setQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                        style={{
                          width: 60, textAlign: 'center', fontWeight: 600,
                          background: 'var(--bg-input)', border: '1px solid var(--border-glass)',
                          borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)',
                          padding: '4px 4px', fontSize: 12,
                        }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.product.unit.toLowerCase()}</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }} onClick={() => updateQuantity(item.product.id, -1)}>
                        <Minus size={13} />
                      </button>
                      <span style={{ width: 24, textAlign: 'center', fontWeight: 600, fontSize: 13 }}>{item.quantity}</span>
                      <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26 }} onClick={() => updateQuantity(item.product.id, 1)}>
                        <Plus size={13} />
                      </button>
                    </div>
                  )}
                  <div style={{ width: 75, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </div>
                  <button className="btn btn-ghost btn-icon" style={{ width: 26, height: 26, color: 'var(--danger-400)' }} onClick={() => removeItem(item.product.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '16px', borderTop: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
              <span>TOTAL</span>
              <span style={{ color: 'var(--accent-400)' }}>{formatCurrency(total)}</span>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: 16 }}
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              <CreditCard size={18} /> Finalizar Venda
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal — Multiple methods */}
      {showPayment && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: 500, padding: 32, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>Pagamento</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPayment(false)}><X size={20} /></button>
            </div>

            <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 24, color: 'var(--accent-400)' }}>
              {formatCurrency(total)}
            </div>

            {/* Payment entries */}
            {paymentEntries.map((entry, idx) => (
              <div key={idx} style={{
                padding: 16, marginBottom: 12,
                background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-glass)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Pagamento {idx + 1}
                  </span>
                  {paymentEntries.length > 1 && (
                    <button
                      className="btn btn-ghost btn-icon"
                      style={{ width: 24, height: 24, color: 'var(--danger-400)' }}
                      onClick={() => removePaymentEntry(idx)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.key}
                      className={`btn ${entry.method === m.key ? 'btn-primary' : 'btn-ghost'}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', justifyContent: 'flex-start', fontSize: 12 }}
                      onClick={() => updatePaymentEntry(idx, 'method', m.key)}
                    >
                      <m.icon size={15} /> {m.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={entry.amount}
                    onChange={e => updatePaymentEntry(idx, 'amount', e.target.value)}
                    style={{ fontSize: 18, textAlign: 'center', height: 44, flex: 1 }}
                    autoFocus={idx === 0}
                  />
                  <button
                    className="btn btn-secondary"
                    style={{ height: 44, fontSize: 12, padding: '0 12px', whiteSpace: 'nowrap' }}
                    onClick={() => fillRemaining(idx)}
                    title="Preencher com valor restante"
                  >
                    <DollarSign size={14} /> Resto
                  </button>
                </div>
              </div>
            ))}

            {/* Add payment button */}
            <button
              className="btn btn-ghost"
              style={{ width: '100%', marginBottom: 16, fontSize: 13, padding: '10px 0' }}
              onClick={addPaymentEntry}
            >
              <Plus size={16} /> Adicionar forma de pagamento
            </button>

            {/* Summary */}
            <div style={{
              padding: 12, borderRadius: 'var(--radius-md)',
              background: remaining > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6, 182, 212, 0.1)',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Total da venda</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Total pago</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(totalPaid)}</span>
              </div>
              {remaining > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: 'var(--danger-400)' }}>
                  <span>Falta</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              ) : change > 0 ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, color: '#06b6d4' }}>
                  <span>Troco</span>
                  <span>{formatCurrency(change)}</span>
                </div>
              ) : null}
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: 16 }}
              disabled={submitting || remaining > 0}
              onClick={finalizeSale}
            >
              {submitting ? <span className="loading-spinner" /> : <><Check size={18} /> Confirmar Pagamento</>}
            </button>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onScan={async (code) => {
            setShowScanner(false);
            try {
              const res = await api.get<ApiResponse<Product>>(`/products/barcode/${code}`);
              const product = res.data.data;
              addToCart(product);
              toast.success(`${product.name} adicionado!`);
            } catch {
              toast.error(`Produto não encontrado para código: ${code}`);
            }
          }}
        />
      )}
    </div>
  );
};

export default PDVPage;
