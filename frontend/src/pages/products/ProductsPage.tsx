import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight,
  Package, AlertTriangle, Filter, Camera,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse, PageResponse } from '../../types';
import BarcodeScanner from '../../components/BarcodeScanner';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  categoryName: string | null;
  supplierName: string | null;
  brand: string | null;
  costPrice: number;
  salePrice: number;
  profitMargin: number;
  currentStock: number;
  minStock: number;
  active: boolean;
  lowStock: boolean;
  unit: string;
}

const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  const [form, setForm] = useState({
    name: '', sku: '', barcode: '', brand: '', unit: 'UN',
    costPrice: '', salePrice: '', minStock: '0', currentStock: '0',
    stockLocation: '', description: '',
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = { page, size: 15 };
      if (search) params.search = search;
      const res = await api.get<ApiResponse<PageResponse<Product>>>('/products', { params });
      setProducts(res.data.data.content);
      setTotal(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error('Erro ao carregar produtos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProducts(); }, [page, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', sku: '', barcode: '', brand: '', unit: 'UN',
      costPrice: '', salePrice: '', minStock: '0', currentStock: '0',
      stockLocation: '', description: '' });
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku || '', barcode: p.barcode || '', brand: p.brand || '',
      unit: p.unit, costPrice: String(p.costPrice), salePrice: String(p.salePrice),
      minStock: String(p.minStock), currentStock: String(p.currentStock),
      stockLocation: '', description: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name, sku: form.sku || undefined, barcode: form.barcode || undefined,
        brand: form.brand || undefined, unit: form.unit, description: form.description || undefined,
        costPrice: parseFloat(form.costPrice), salePrice: parseFloat(form.salePrice),
        minStock: parseInt(form.minStock), currentStock: parseInt(form.currentStock),
        stockLocation: form.stockLocation || undefined,
      };
      if (editing) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success('Produto atualizado!');
      } else {
        await api.post('/products', payload);
        toast.success('Produto cadastrado!');
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Desativar "${p.name}"?`)) return;
    try {
      await api.delete(`/products/${p.id}`);
      toast.success('Produto desativado');
      fetchProducts();
    } catch { toast.error('Erro ao desativar'); }
  };

  const fmt = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Produtos</h1>
          <p>Gerencie o catálogo de produtos da sua loja</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-search">
            <Search />
            <input placeholder="Buscar por nome, SKU ou código de barras..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <Package size={64} />
            <h3>Nenhum produto encontrado</h3>
            <p>Cadastre o primeiro produto clicando no botão acima</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'right' }}>Custo</th>
                  <th style={{ textAlign: 'right' }}>Venda</th>
                  <th style={{ textAlign: 'right' }}>Margem</th>
                  <th style={{ textAlign: 'center' }}>Estoque</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="stat-icon primary" style={{ width: 36, height: 36 }}>
                          <Package size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          {p.brand && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.brand}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.sku || '—'}</td>
                    <td>{p.categoryName || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{fmt(p.costPrice)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(p.salePrice)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${p.profitMargin >= 30 ? 'badge-success' : p.profitMargin >= 15 ? 'badge-warning' : 'badge-danger'}`}>
                        {p.profitMargin?.toFixed(1)}%
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="flex items-center gap-2" style={{ justifyContent: 'center' }}>
                        {p.lowStock && <AlertTriangle size={14} style={{ color: 'var(--warning-400)' }} />}
                        <span style={{ fontWeight: 600, color: p.currentStock === 0 ? 'var(--danger-400)' : p.lowStock ? 'var(--warning-400)' : 'var(--text-primary)' }}>
                          {p.currentStock}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${p.active ? 'badge-success' : 'badge-danger'}`}>
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Edit2 size={16} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(p)}
                          style={{ color: 'var(--danger-400)' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-pagination">
              <span>Mostrando {products.length} de {total} produtos</span>
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

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Produto' : 'Novo Produto'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input className="form-input" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">SKU</label>
                    <input className="form-input" value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Código de Barras</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="form-input" value={form.barcode}
                        onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                        style={{ flex: 1 }} />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ height: 40, width: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={() => setShowScanner(true)}
                        title="Escanear código de barras"
                      >
                        <Camera size={18} />
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Marca</label>
                    <input className="form-input" value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unidade</label>
                    <select className="form-input form-select" value={form.unit}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                      <option value="UN">Unidade</option>
                      <option value="KG">Quilograma</option>
                      <option value="L">Litro</option>
                      <option value="M">Metro</option>
                      <option value="CX">Caixa</option>
                      <option value="PC">Peça</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Preço de Custo *</label>
                    <input type="number" step="0.01" className="form-input" value={form.costPrice}
                      onChange={(e) => setForm({ ...form, costPrice: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Preço de Venda *</label>
                    <input type="number" step="0.01" className="form-input" value={form.salePrice}
                      onChange={(e) => setForm({ ...form, salePrice: e.target.value })} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Estoque Mínimo</label>
                    <input type="number" className="form-input" value={form.minStock}
                      onChange={(e) => setForm({ ...form, minStock: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Estoque Atual</label>
                    <input type="number" className="form-input" value={form.currentStock}
                      onChange={(e) => setForm({ ...form, currentStock: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input" rows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> {editing ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(false)}
          onScan={(code) => {
            setShowScanner(false);
            setForm(prev => ({ ...prev, barcode: code }));
            toast.success(`Código capturado: ${code}`);
          }}
        />
      )}
    </div>
  );
};

export default ProductsPage;
