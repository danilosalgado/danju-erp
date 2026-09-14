import React, { useState, useRef, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Smartphone, ShoppingCart, Printer, X, Check, Camera, Edit3, DollarSign, Tag, UserCircle, Loader2, QrCode, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse } from '../../types';
import BarcodeScanner from '../../components/BarcodeScanner';
import SaleReceipt, { type SaleReceiptData } from '../../components/SaleReceipt';
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

interface CustomerOption {
  id: string;
  name: string;
  cpfCnpj: string | null;
  phone: string | null;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface SaleResult extends SaleReceiptData {
  id: string;
}

interface PaymentEntry {
  method: string;
  amount: string;
  /** Cobranca aprovada na maquininha que cobre esta linha. */
  terminalPaymentId?: string;
  nsu?: string;
  cardBrand?: string;
}

interface TerminalPayment {
  id: string;
  amount: number;
  method: string;
  status: 'PENDENTE' | 'ENVIADO' | 'APROVADO' | 'RECUSADO' | 'CANCELADO' | 'EXPIRADO';
  nsu: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  errorMessage: string | null;
  provider: string | null;
  qrCodeText: string | null;
  qrCodeImageUrl: string | null;
}

// O PagBank confere o digito verificador e recusa a cobranca. Validar aqui faz o
// caixa ver o erro no campo, antes de gerar o QR com o cliente esperando.
const onlyDigits = (v: string) => v.replace(/\D/g, '');

const isValidTaxId = (value: string): boolean => {
  const d = onlyDigits(value);
  if (d.length === 11) {
    if (/^(\d)\1{10}$/.test(d)) return false;
    const digit = (len: number, start: number) => {
      let sum = 0;
      for (let i = 0; i < len; i++) sum += Number(d[i]) * (start - i);
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    return digit(9, 10) === Number(d[9]) && digit(10, 11) === Number(d[10]);
  }
  if (d.length === 14) {
    if (/^(\d)\1{13}$/.test(d)) return false;
    const calc = (weights: number[]) => {
      const sum = weights.reduce((acc, w, i) => acc + Number(d[i]) * w, 0);
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[12])
      && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[13]);
  }
  return false;
};

const formatTaxId = (value: string) => {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

const PAYMENT_METHODS = [
  { key: 'DINHEIRO', label: 'Dinheiro', icon: Banknote, color: '#06b6d4' },
  { key: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard, color: '#6366f1' },
  { key: 'CARTAO_DEBITO', label: 'Débito', icon: CreditCard, color: '#06b6d4' },
  { key: 'PIX', label: 'PIX', icon: Smartphone, color: '#8b5cf6' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

// Dinheiro é arredondado para centavos antes de comparar ou enviar. Sem isso um
// total com precisão abaixo do centavo (1,237 KG × R$ 80,90 = 100,0733, ou um
// preço editado com 3 casas) deixa o restante positivo por uma fração invisível:
// a tela exibe "Falta R$ 0,00" e o botão de confirmar fica travado.
const toCents = (value: number) => Math.round(value * 100);
const round2 = (value: number) => toCents(value) / 100;

const PDVPage: React.FC = () => {
  const { cart, addToCart: storeAddToCart, updateQuantity, setQuantity, setItemPrice, removeItem, clearCart } = usePDVStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([{ method: 'DINHEIRO', amount: '' }]);
  const [discountValue, setDiscountValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SaleResult | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState('');
  const [pixEnabled, setPixEnabled] = useState(false);
  const [charging, setCharging] = useState<{ index: number; id: string; status: string; qr?: TerminalPayment } | null>(null);
  const abortPoll = useRef(false);
  const [payerTaxId, setPayerTaxId] = useState('');
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const customerTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    searchRef.current?.focus();
    // Sem token do PagBank configurado o backend responde enabled=false e o
    // PDV segue no fluxo manual de sempre.
    api.get<ApiResponse<{ pixEnabled: boolean }>>('/terminal-payments/config')
      .then(res => setPixEnabled(res.data.data.pixEnabled))
      .catch(() => setPixEnabled(false));
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

  // Vincular a venda ao cliente e o que alimenta o historico de compras do CRM.
  const searchCustomers = (query: string) => {
    if (customerTimeout.current) clearTimeout(customerTimeout.current);
    if (!query.trim()) { setCustomerResults([]); return; }
    customerTimeout.current = setTimeout(async () => {
      try {
        const res = await api.get<ApiResponse<{ content: CustomerOption[] }>>('/customers', {
          params: { search: query, active: true, size: 8 },
        });
        setCustomerResults(res.data.data.content);
      } catch { setCustomerResults([]); }
    }, 300);
  };

  const isWeightUnit = (unit: string) => ['KG', 'L', 'M'].includes(unit);

  const addToCart = (product: Product) => {
    storeAddToCart(product, isWeightUnit(product.unit));
    setSearchQuery('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  // Espelha o cálculo do backend item a item (salePrice × qty − desconto, com
  // arredondamento por item). Arredondar só a soma divergiria dele em centavos.
  const itemDiscountOf = (i: CartItem) =>
    round2(i.product.salePrice * i.quantity - i.unitPrice * i.quantity + i.discount);
  const itemTotalOf = (i: CartItem) =>
    round2(i.product.salePrice * i.quantity - itemDiscountOf(i));

  const subtotal = round2(cart.reduce((sum, i) => sum + itemTotalOf(i), 0));

  // Desconto da venda em reais, aplicado na tela de confirmação de pagamento
  // e limitado ao subtotal para o total nunca ficar negativo.
  const rawDiscount = Number(discountValue) || 0;
  const discountAmount = Math.min(subtotal, Math.max(0, round2(rawDiscount)));
  const total = round2(subtotal - discountAmount);

  // Payment helpers
  const totalPaid = round2(paymentEntries.reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  const remaining = Math.max(0, round2(total - totalPaid));
  const hasCash = paymentEntries.some(p => p.method === 'DINHEIRO');
  const cashTotal = round2(paymentEntries.filter(p => p.method === 'DINHEIRO').reduce((sum, p) => sum + (Number(p.amount) || 0), 0));
  const change = toCents(totalPaid) > toCents(total) && hasCash ? round2(totalPaid - total) : 0;

  const addPaymentEntry = () => {
    setPaymentEntries([...paymentEntries, { method: 'PIX', amount: '' }]);
  };

  const removePaymentEntry = (index: number) => {
    if (paymentEntries.length <= 1) return;
    setPaymentEntries(paymentEntries.filter((_, i) => i !== index));
  };

  const updatePaymentEntry = (index: number, field: keyof PaymentEntry, value: string) => {
    setPaymentEntries(paymentEntries.map((p, i) => {
      if (i !== index) return p;
      // Trocar valor ou forma invalida a autorizacao que veio da maquininha:
      // o backend recusaria a venda por divergencia. Solta o vinculo aqui.
      const releasesTerminal = (field === 'amount' || field === 'method') && p.terminalPaymentId;
      return releasesTerminal
        ? { ...p, [field]: value, terminalPaymentId: undefined, nsu: undefined, cardBrand: undefined }
        : { ...p, [field]: value };
    }));
  };

  const releaseTerminalPayment = (index: number) => {
    setPaymentEntries(prev => prev.map((p, i) => i === index
      ? { ...p, terminalPaymentId: undefined, nsu: undefined, cardBrand: undefined }
      : p));
  };

  // ---- Cobranca na maquininha (PagBank / Moderninha Smart) ----
  // O navegador nao fala com a maquininha: o backend enfileira a cobranca, o app
  // da Moderninha busca, roda o PlugPag e devolve o resultado. Aqui so criamos a
  // ordem e acompanhamos ate ela virar aprovada ou recusada.
  const pollTerminal = async (index: number, id: string) => {
    abortPoll.current = false;
    while (!abortPoll.current) {
      await new Promise(r => setTimeout(r, 2000));
      if (abortPoll.current) return;
      try {
        const res = await api.get<ApiResponse<TerminalPayment>>(`/terminal-payments/${id}`);
        const p = res.data.data;
        setCharging(c => (c && c.id === id ? { ...c, status: p.status } : c));

        if (p.status === 'APROVADO') {
          setPaymentEntries(prev => prev.map((e, i) => i === index ? {
            ...e,
            amount: p.amount.toFixed(2),
            terminalPaymentId: p.id,
            nsu: p.nsu ?? undefined,
            cardBrand: [p.cardBrand, p.cardLast4 && `****${p.cardLast4}`].filter(Boolean).join(' ') || undefined,
          } : e));
          setCharging(null);
          toast.success('Pagamento aprovado na maquininha!');
          return;
        }
        if (p.status === 'RECUSADO' || p.status === 'CANCELADO' || p.status === 'EXPIRADO') {
          setCharging(null);
          toast.error(p.errorMessage || `Pagamento ${p.status.toLowerCase()}`);
          return;
        }
      } catch {
        setCharging(null);
        toast.error('Erro ao consultar a maquininha');
        return;
      }
    }
  };

  const chargeOnTerminal = async (index: number) => {
    const entry = paymentEntries[index];
    const amount = round2(Number(entry.amount) || 0);
    if (amount <= 0) { toast.error('Informe o valor antes de cobrar'); return; }

    try {
      const res = await api.post<ApiResponse<TerminalPayment>>('/terminal-payments', {
        amount,
        method: entry.method,
        installments: 1,
        // "CPF na nota" tem prioridade; depois o cadastro do cliente; e se nao
        // vier nenhum dos dois, o backend usa o documento da loja.
        ...(payerTaxId.trim() && { payerTaxId: onlyDigits(payerTaxId) }),
        ...(customer && { customerId: customer.id }),
      });
      const intent = res.data.data;
      setCharging({
        index, id: intent.id, status: intent.status,
        qr: intent.qrCodeImageUrl ? intent : undefined,
      });
      pollTerminal(index, intent.id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao gerar a cobrança');
    }
  };

  const copyPixCode = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Código PIX copiado!');
    } catch {
      toast.error('Não consegui copiar — selecione o código manualmente');
    }
  };

  const cancelTerminalCharge = async () => {
    if (!charging) return;
    abortPoll.current = true;
    const id = charging.id;
    setCharging(null);
    try { await api.post(`/terminal-payments/${id}/cancel`); }
    catch { /* pode ja ter finalizado na maquininha; o status final manda */ }
  };

  const fillRemaining = (index: number) => {
    const othersPaid = paymentEntries.reduce((sum, p, i) => i !== index ? sum + (Number(p.amount) || 0) : sum, 0);
    const rem = Math.max(0, round2(total - othersPaid));
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

    if (toCents(totalPaid) < toCents(total)) {
      toast.error(`Pagamento insuficiente. Faltam ${formatCurrency(remaining)}`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...(customer && { customerId: customer.id }),
        items: cart.map(i => ({
          productId: i.product.id,
          quantity: i.quantity,
          // discount = originalTotal - customTotal
          discount: itemDiscountOf(i),
        })),
        payments: validPayments.map(p => ({
          method: p.method,
          amount: round2(Number(p.amount)),
          installments: 1,
          reference: p.nsu ?? '',
          ...(p.terminalPaymentId && { terminalPaymentId: p.terminalPaymentId }),
        })),
        ...(discountAmount > 0 && {
          discountType: 'FIXO',
          // envia o desconto já limitado ao subtotal para o total bater com o backend
          discountValue: discountAmount,
        }),
      };
      const res = await api.post<ApiResponse<SaleResult>>('/sales', payload);
      setReceipt(res.data.data);
      clearCart();
      setShowPayment(false);
      setPaymentEntries([{ method: 'DINHEIRO', amount: '' }]);
      setDiscountValue('');
      setCustomer(null);
      setCustomerQuery('');
      setCustomerResults([]);
      setPayerTaxId('');
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
      <div>
        <SaleReceipt sale={receipt} />
        <div className="receipt-actions" style={{ display: 'flex', gap: 12, marginTop: 20, maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
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

      <div className="split-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20, minHeight: '70vh' }}>
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
        <div className="card pdv-cart-panel" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content', position: 'sticky', top: 20 }}>
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
                    {formatCurrency(itemTotalOf(item))}
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 500, padding: 32, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2>Pagamento</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPayment(false)}><X size={20} /></button>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              {discountAmount > 0 && (
                <div style={{ fontSize: 15, color: 'var(--text-muted)', textDecoration: 'line-through' }}>
                  {formatCurrency(subtotal)}
                </div>
              )}
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-400)' }}>
                {formatCurrency(total)}
              </div>
              {discountAmount > 0 && (
                <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginTop: 2 }}>
                  Desconto de {formatCurrency(discountAmount)}
                </div>
              )}
            </div>

            {/* Cliente (opcional) — alimenta o historico de compras do CRM */}
            <div style={{
              padding: 16, marginBottom: 16,
              background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <UserCircle size={14} /> Cliente <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(opcional)</span>
                </span>
                {customer && (
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ width: 24, height: 24, color: 'var(--danger-400)' }}
                    onClick={() => { setCustomer(null); setCustomerQuery(''); setCustomerResults([]); }}
                    title="Remover cliente"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {customer ? (
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {customer.name}
                  {customer.cpfCnpj && (
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                      {customer.cpfCnpj}
                    </span>
                  )}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder="Buscar por nome ou CPF..."
                    value={customerQuery}
                    onChange={e => { setCustomerQuery(e.target.value); searchCustomers(e.target.value); }}
                    style={{ height: 40 }}
                  />
                  {customerResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                      marginTop: 4, maxHeight: 200, overflowY: 'auto',
                      background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}>
                      {customerResults.map(c => (
                        <button
                          key={c.id}
                          className="btn btn-ghost"
                          style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 12px', borderRadius: 0, textAlign: 'left' }}
                          onClick={() => { setCustomer(c); setCustomerResults([]); setCustomerQuery(''); }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {[c.cpfCnpj, c.phone].filter(Boolean).join(' · ') || 'sem documento'}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desconto da venda */}
            <div style={{
              padding: 16, marginBottom: 16,
              background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-glass)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag size={14} /> Desconto
                </span>
                {discountAmount > 0 && (
                  <button
                    className="btn btn-ghost btn-icon"
                    style={{ width: 24, height: 24, color: 'var(--danger-400)' }}
                    onClick={() => setDiscountValue('')}
                    title="Remover desconto"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{
                  display: 'flex', alignItems: 'center', gap: 4, height: 44, padding: '0 12px',
                  fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
                }}>
                  <DollarSign size={14} /> R$
                </span>
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max={subtotal}
                  placeholder="0,00"
                  value={discountValue}
                  onChange={e => setDiscountValue(e.target.value)}
                  style={{ fontSize: 18, textAlign: 'center', height: 44, flex: 1 }}
                />
              </div>
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

                {/* Cobranca automatica de PIX pela API do PagBank */}
                {pixEnabled && entry.method === 'PIX' && (
                  entry.terminalPaymentId ? (
                    <div style={{
                      marginTop: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    }}>
                      <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Check size={14} /> PIX confirmado
                        {entry.nsu && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>NSU {entry.nsu}</span>}
                        {entry.cardBrand && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{entry.cardBrand}</span>}
                      </span>
                      <button
                        className="btn btn-ghost btn-icon"
                        style={{ width: 24, height: 24, color: 'var(--danger-400)' }}
                        onClick={() => releaseTerminalPayment(idx)}
                        title="Desvincular esta cobrança"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                    {(
                      <div style={{ marginTop: 8 }}>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                          CPF na nota <span style={{ opacity: 0.7 }}>(opcional — em branco usa o CNPJ da loja)</span>
                        </label>
                        <input
                          className="form-input"
                          placeholder="000.000.000-00"
                          value={payerTaxId}
                          onChange={e => setPayerTaxId(formatTaxId(e.target.value))}
                          style={{
                            height: 38, fontSize: 14,
                            borderColor: payerTaxId && !isValidTaxId(payerTaxId) ? 'var(--danger-400)' : undefined,
                          }}
                        />
                        {payerTaxId && !isValidTaxId(payerTaxId) && (
                          <div style={{ fontSize: 11, color: 'var(--danger-400)', marginTop: 4 }}>
                            CPF/CNPJ inválido
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      className="btn btn-secondary"
                      style={{ width: '100%', marginTop: 8, height: 40, fontSize: 13 }}
                      disabled={
                        !!charging
                        || !(Number(entry.amount) > 0)
                        || (!!payerTaxId && !isValidTaxId(payerTaxId))
                      }
                      onClick={() => chargeOnTerminal(idx)}
                    >
                      <QrCode size={15} /> Gerar QR Code PIX
                    </button>
                    </>
                  )
                )}
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
              {discountAmount > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: '#f59e0b' }}>
                    <span>Desconto</span>
                    <span style={{ fontWeight: 600 }}>− {formatCurrency(discountAmount)}</span>
                  </div>
                </>
              )}
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
              disabled={submitting || toCents(remaining) > 0}
              onClick={finalizeSale}
            >
              {submitting ? <span className="loading-spinner" /> : <><Check size={18} /> Confirmar Pagamento</>}
            </button>
          </div>
        </div>
      )}

      {/* Aguardando a maquininha — o cliente esta com o cartao na mao */}
      {charging && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16,
        }}>
          <div className="card" style={{ width: '100%', maxWidth: 420, padding: 32, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 6 }}>Pagamento via PIX</h3>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              O cliente escaneia com o app do banco
            </p>

            {/* O PagBank serve o PNG do QR numa URL publica, entao da para
                exibir direto sem precisar gerar a imagem no navegador. */}
            {charging.qr?.qrCodeImageUrl && (
              <div style={{ background: '#fff', padding: 12, borderRadius: 'var(--radius-md)', display: 'inline-block', marginBottom: 16 }}>
                <img src={charging.qr.qrCodeImageUrl} alt="QR Code do PIX" style={{ width: 200, height: 200, display: 'block' }} />
              </div>
            )}

            <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--accent-400)', marginBottom: 16 }}>
              {formatCurrency(round2(Number(paymentEntries[charging.index]?.amount) || 0))}
            </div>

            {charging.qr?.qrCodeText && (
              <button
                className="btn btn-secondary"
                style={{ width: '100%', marginBottom: 12, fontSize: 13 }}
                onClick={() => copyPixCode(charging.qr!.qrCodeText!)}
              >
                <Copy size={15} /> Copiar código (copia e cola)
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, color: 'var(--text-muted)', fontSize: 13 }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
              Aguardando o pagamento...
            </div>
            <button className="btn btn-ghost" style={{ width: '100%' }} onClick={cancelTerminalCharge}>
              <X size={16} /> Cancelar cobrança
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
