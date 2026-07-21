import React, { useState, useEffect } from 'react';
import {
  Plus, Search, X, Check, ChevronLeft, ChevronRight,
  ShoppingCart, Trash2, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse, PageResponse } from '../../types';

interface SimpleProduct {
  id: string;
  name: string;
  sku: string;
  salePrice: number;
  costPrice: number;
  currentStock: number;
  unit: string;
}

interface SimpleSupplier {
  id: string;
  companyName: string;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: string;
  unitCost: string;
}

interface PurchaseRecord {
  id: string;
  supplierName: string | null;
  purchaseDate: string;
  totalCost: number;
  notes: string | null;
  status: string;
  items: { productName: string; quantity: number; unitCost: number; totalCost: number }[];
  createdAt: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const PurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<SimpleSupplier[]>([]);
  const [products, setProducts] = useState<SimpleProduct[]>([]);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([{ productId: '', productName: '', quantity: '1', unitCost: '' }]);
  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [detail, setDetail] = useState<PurchaseRecord | null>(null);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<PageResponse<PurchaseRecord>>>('/purchases', { params: { page, size: 15 } });
      setPurchases(res.data.data.content);
      setTotal(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error('Erro ao carregar compras'); }
    finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await api.get<ApiResponse<PageResponse<SimpleSupplier>>>('/suppliers', { params: { size: 100 } });
      setSuppliers(res.data.data.content);
    } catch {}
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get<ApiResponse<PageResponse<SimpleProduct>>>('/products', { params: { active: true, size: 200 } });
      setProducts(res.data.data.content);
    } catch {}
  };

  useEffect(() => { fetchPurchases(); }, [page]);
  useEffect(() => { fetchSuppliers(); fetchProducts(); }, []);

  const addItem = () => {
    setItems([...items, { productId: '', productName: '', quantity: '1', unitCost: '' }]);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof PurchaseItem, value: string) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          updated.productName = prod.name;
          if (!updated.unitCost) updated.unitCost = String(prod.costPrice);
        }
      }
      return updated;
    }));
  };

  const purchaseTotal = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitCost) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter(i => i.productId && Number(i.quantity) > 0 && Number(i.unitCost) > 0);
    if (validItems.length === 0) { toast.error('Adicione pelo menos um item válido'); return; }

    setSubmitting(true);
    try {
      await api.post('/purchases', {
        supplierId: supplierId || null,
        purchaseDate,
        notes: notes || null,
        items: validItems.map(i => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitCost: Number(i.unitCost),
        })),
      });
      toast.success('Compra registrada! Estoque atualizado.');
      setModalOpen(false);
      setSupplierId('');
      setNotes('');
      setItems([{ productId: '', productName: '', quantity: '1', unitCost: '' }]);
      fetchPurchases();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao registrar compra');
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Compras</h1>
          <p>Registre compras e reestoque de produtos</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={18} /> Nova Compra
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-page"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : purchases.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={64} />
            <h3>Nenhuma compra registrada</h3>
            <p>Registre sua primeira compra clicando no botão acima</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Fornecedor</th>
                  <th style={{ textAlign: 'center' }}>Itens</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Observações</th>
                  <th style={{ textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{new Date(p.purchaseDate + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td>{p.supplierName || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-info">{p.items?.length || 0}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-400)' }}>
                      {formatCurrency(p.totalCost)}
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.notes || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDetail(p)}>
                        <Package size={14} /> Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-pagination">
              <span>Mostrando {purchases.length} de {total} compras</span>
              <div className="table-pagination-buttons">
                <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  <ChevronLeft size={16} />
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13 }}>{page + 1} / {totalPages || 1}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* New Purchase Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 700 }}>
            <div className="modal-header">
              <h3 className="modal-title">Nova Compra</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Fornecedor</label>
                    <select className="form-input form-select" value={supplierId}
                      onChange={e => setSupplierId(e.target.value)}>
                      <option value="">Sem fornecedor</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.companyName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data da Compra</label>
                    <input type="date" className="form-input" value={purchaseDate}
                      onChange={e => setPurchaseDate(e.target.value)} />
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label className="form-label">Itens da Compra</label>
                  {items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto',
                      gap: 8, marginBottom: 8, alignItems: 'end',
                    }}>
                      <div>
                        {idx === 0 && <label className="form-label" style={{ fontSize: 11 }}>Produto</label>}
                        <select className="form-input form-select" value={item.productId}
                          onChange={e => updateItem(idx, 'productId', e.target.value)} required>
                          <option value="">Selecione...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        {idx === 0 && <label className="form-label" style={{ fontSize: 11 }}>Quantidade</label>}
                        <input type="number" step="0.001" min="0.001" className="form-input" placeholder="Qtd"
                          value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} required />
                      </div>
                      <div>
                        {idx === 0 && <label className="form-label" style={{ fontSize: 11 }}>Custo Unit.</label>}
                        <input type="number" step="0.01" min="0.01" className="form-input" placeholder="R$ 0,00"
                          value={item.unitCost} onChange={e => updateItem(idx, 'unitCost', e.target.value)} required />
                      </div>
                      <div>
                        {idx === 0 && <label className="form-label" style={{ fontSize: 11 }}>Total</label>}
                        <input className="form-input" readOnly
                          value={formatCurrency((Number(item.quantity) || 0) * (Number(item.unitCost) || 0))}
                          style={{ background: 'var(--bg-hover)', fontWeight: 600 }} />
                      </div>
                      <button type="button" className="btn btn-ghost btn-icon"
                        style={{ width: 36, height: 36, color: 'var(--danger-400)', marginBottom: idx === 0 ? 0 : undefined }}
                        onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 13, marginTop: 4 }}
                    onClick={addItem}>
                    <Plus size={14} /> Adicionar Item
                  </button>
                </div>

                <div style={{
                  display: 'flex', justifyContent: 'space-between', padding: '12px 16px',
                  background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)',
                  fontSize: 16, fontWeight: 700, marginBottom: 16,
                }}>
                  <span>Total da Compra</span>
                  <span style={{ color: 'var(--accent-400)' }}>{formatCurrency(purchaseTotal)}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea className="form-input" rows={2} value={notes}
                    onChange={e => setNotes(e.target.value)} style={{ resize: 'vertical' }}
                    placeholder="Nota fiscal, referência, etc." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? <span className="loading-spinner" /> : <><Check size={16} /> Registrar Compra</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">Detalhes da Compra</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setDetail(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Data</span>
                  <div style={{ fontWeight: 500 }}>{new Date(detail.purchaseDate + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                </div>
                <div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fornecedor</span>
                  <div style={{ fontWeight: 500 }}>{detail.supplierName || '—'}</div>
                </div>
              </div>
              <table style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th style={{ textAlign: 'center' }}>Qtd</th>
                    <th style={{ textAlign: 'right' }}>Custo Unit.</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.items?.map((item, i) => (
                    <tr key={i}>
                      <td>{item.productName}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitCost)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{
                display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700,
                marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-glass)',
              }}>
                <span>Total</span>
                <span style={{ color: 'var(--accent-400)' }}>{formatCurrency(detail.totalCost)}</span>
              </div>
              {detail.notes && (
                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                  <strong>Obs:</strong> {detail.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesPage;
