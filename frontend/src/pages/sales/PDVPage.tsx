import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ShoppingCart, Printer, X, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse } from '../../types';

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  salePrice: number;
  currentStock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
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

const PAYMENT_METHODS = [
  { key: 'DINHEIRO', label: 'Dinheiro', icon: Banknote, color: '#06b6d4' },
  { key: 'CARTAO_CREDITO', label: 'Cartão Crédito', icon: CreditCard, color: '#6366f1' },
  { key: 'CARTAO_DEBITO', label: 'Cartão Débito', icon: CreditCard, color: '#06b6d4' },
  { key: 'PIX', label: 'PIX', icon: Smartphone, color: '#8b5cf6' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const PDVPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('DINHEIRO');
  const [amountReceived, setAmountReceived] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SaleResult | null>(null);
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

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
    setSearchQuery('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.product.salePrice * i.quantity - i.discount, 0);
  const total = subtotal;
  const change = selectedMethod === 'DINHEIRO' && Number(amountReceived) > total
    ? Number(amountReceived) - total : 0;

  const finalizeSale = async () => {
    if (cart.length === 0) { toast.error('Adicione itens ao carrinho'); return; }
    const payAmount = selectedMethod === 'DINHEIRO' ? Number(amountReceived) : total;
    if (selectedMethod === 'DINHEIRO' && payAmount < total) {
      toast.error('Valor recebido insuficiente'); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, discount: i.discount })),
        payments: [{ method: selectedMethod, amount: payAmount, installments: 1, reference: '' }],
      };
      const res = await api.post<ApiResponse<SaleResult>>('/sales', payload);
      setReceipt(res.data.data);
      setCart([]);
      setShowPayment(false);
      toast.success('Venda registrada com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar venda');
    } finally { setSubmitting(false); }
  };

  const printReceipt = () => {
    window.print();
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
            Venda #{receipt.saleNumber} — {new Date(receipt.createdAt).toLocaleString('pt-BR')}
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
            <span>{p.method.replace('_', ' ')}</span>
            <span>{formatCurrency(p.amount)}</span>
          </div>
        ))}
        {receipt.payments.some(p => p.changeAmount > 0) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 600, color: '#06b6d4', marginTop: 8 }}>
            <span>TROCO</span>
            <span>{formatCurrency(receipt.payments[0].changeAmount)}</span>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, minHeight: '70vh' }}>
        {/* Left: Product search + results */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ position: 'relative' }}>
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
                          {p.currentStock}
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
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-glass)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{item.product.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--accent-400)' }}>
                      {formatCurrency(item.product.salePrice)} × {item.quantity}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => updateQuantity(item.product.id, -1)}>
                      <Minus size={14} />
                    </button>
                    <span style={{ width: 28, textAlign: 'center', fontWeight: 600 }}>{item.quantity}</span>
                    <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28 }} onClick={() => updateQuantity(item.product.id, 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <div style={{ width: 80, textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                    {formatCurrency(item.product.salePrice * item.quantity)}
                  </div>
                  <button className="btn btn-ghost btn-icon" style={{ width: 28, height: 28, color: 'var(--danger-400)' }} onClick={() => removeItem(item.product.id)}>
                    <Trash2 size={14} />
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

      {/* Payment Modal */}
      {showPayment && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div className="card" style={{ width: 440, padding: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>Pagamento</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPayment(false)}><X size={20} /></button>
            </div>

            <div style={{ fontSize: 28, fontWeight: 700, textAlign: 'center', marginBottom: 24, color: 'var(--accent-400)' }}>
              {formatCurrency(total)}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.key}
                  className={`btn ${selectedMethod === m.key ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', justifyContent: 'flex-start' }}
                  onClick={() => setSelectedMethod(m.key)}
                >
                  <m.icon size={18} /> {m.label}
                </button>
              ))}
            </div>

            {selectedMethod === 'DINHEIRO' && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">Valor Recebido</label>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amountReceived}
                  onChange={e => setAmountReceived(e.target.value)}
                  style={{ fontSize: 20, textAlign: 'center', height: 52 }}
                  autoFocus
                />
                {change > 0 && (
                  <div style={{ textAlign: 'center', marginTop: 8, fontSize: 18, fontWeight: 700, color: '#06b6d4' }}>
                    Troco: {formatCurrency(change)}
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', height: 48, fontSize: 16 }}
              disabled={submitting || (selectedMethod === 'DINHEIRO' && Number(amountReceived) < total)}
              onClick={finalizeSale}
            >
              {submitting ? <span className="loading-spinner" /> : <><Check size={18} /> Confirmar Pagamento</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDVPage;
