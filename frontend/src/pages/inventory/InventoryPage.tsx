import React, { useState, useEffect } from 'react';
import {
  Package, DollarSign, AlertTriangle, TrendingUp,
  Search, ChevronLeft, ChevronRight, ArrowUpDown, XCircle, CheckCircle,
  BarChart3, Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse, PageResponse } from '../../types';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  categoryName: string | null;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minStock: number;
  unit: string;
  lowStock: boolean;
}

interface InventorySummary {
  totalCostValue: number;
  totalSaleValue: number;
  totalActiveProducts: number;
  totalItems: number;
  healthyStock: number;
  lowStockCount: number;
  outOfStockCount: number;
  topValueProducts: { name: string; currentStock: number; unit: string; salePrice: number; stockValue: number }[];
  categories: { name: string; count: number; stockValue: number }[];
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const formatQty = (v: number) => {
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(3).replace(/\.?0+$/, '');
};

const InventoryPage: React.FC = () => {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [loading, setLoading] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await api.get<ApiResponse<InventorySummary>>('/products/inventory-summary');
      setSummary(res.data.data);
    } catch { toast.error('Erro ao carregar resumo'); }
    finally { setLoadingSummary(false); }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = { page, size: 15, active: true };
      if (search) params.search = search;
      const res = await api.get<ApiResponse<PageResponse<Product>>>('/products', { params });
      let list = res.data.data.content;
      if (filter === 'low') list = list.filter(p => p.currentStock > 0 && p.currentStock <= p.minStock);
      else if (filter === 'out') list = list.filter(p => p.currentStock <= 0);
      else if (filter === 'ok') list = list.filter(p => p.currentStock > p.minStock);
      setProducts(list);
      setTotal(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error('Erro ao carregar produtos'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSummary(); }, []);
  useEffect(() => { fetchProducts(); }, [page, search, filter]);

  const profitMargin = summary
    ? summary.totalSaleValue - summary.totalCostValue
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Estoque</h1>
          <p>Visão geral e controle do inventário</p>
        </div>
      </div>

      {/* Summary Cards */}
      {loadingSummary ? (
        <div className="loading-page"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
      ) : summary && (
        <>
          <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {/* Total Stock Value */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Valor Total (Venda)</span>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(6,182,212,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DollarSign size={18} style={{ color: 'var(--accent-400)' }} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-400)' }}>
                {formatCurrency(summary.totalSaleValue)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Custo: {formatCurrency(summary.totalCostValue)}
              </div>
            </div>

            {/* Potential Profit */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Lucro Potencial</span>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={18} style={{ color: '#22c55e' }} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>
                {formatCurrency(profitMargin)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Margem: {summary.totalCostValue > 0 ? ((profitMargin / summary.totalCostValue) * 100).toFixed(1) : 0}%
              </div>
            </div>

            {/* Total Products */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Produtos Ativos</span>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={18} style={{ color: '#6366f1' }} />
                </div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {summary.totalActiveProducts}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {formatQty(summary.totalItems)} unidades em estoque
              </div>
            </div>

            {/* Stock Health */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Saúde do Estoque</span>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: summary.outOfStockCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {summary.outOfStockCount > 0 ? <AlertTriangle size={18} style={{ color: '#ef4444' }} /> : <CheckCircle size={18} style={{ color: '#22c55e' }} />}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{summary.healthyStock}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Normal</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{summary.lowStockCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Baixo</div>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{summary.outOfStockCount}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Zerado</div>
                </div>
              </div>
            </div>
          </div>

          {/* Two column: Top Products + Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Top Products by Value */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><BarChart3 size={16} /> Produtos Mais Valiosos</h3>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                {summary.topValueProducts.map((p, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 0', borderBottom: i < summary.topValueProducts.length - 1 ? '1px solid var(--border-glass)' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: i === 0 ? 'var(--accent-400)' : 'var(--bg-hover)',
                        color: i === 0 ? '#fff' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                      }}>{i + 1}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {formatQty(p.currentStock)} {p.unit} × {formatCurrency(p.salePrice)}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--accent-400)', fontSize: 14 }}>
                      {formatCurrency(p.stockValue)}
                    </span>
                  </div>
                ))}
                {summary.topValueProducts.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                    Nenhum produto com estoque
                  </div>
                )}
              </div>
            </div>

            {/* Categories Breakdown */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title"><Layers size={16} /> Estoque por Categoria</h3>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                {summary.categories.map((cat, i) => {
                  const pct = summary.totalSaleValue > 0 ? (cat.stockValue / summary.totalSaleValue) * 100 : 0;
                  return (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>{cat.name} <span style={{ color: 'var(--text-muted)' }}>({cat.count})</span></span>
                        <span style={{ fontWeight: 600, color: 'var(--accent-400)' }}>{formatCurrency(cat.stockValue)}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-hover)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${Math.min(pct, 100)}%`,
                          background: 'linear-gradient(90deg, var(--accent-400), var(--accent-300))',
                          borderRadius: 99, transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  );
                })}
                {summary.categories.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 }}>
                    Nenhuma categoria encontrada
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Products Table */}
      <div className="card">
        <div className="card-header" style={{ flexWrap: 'wrap', gap: 12 }}>
          <h3 className="card-title"><ArrowUpDown size={16} /> Controle de Estoque</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Status Filters */}
            {(['all', 'ok', 'low', 'out'] as const).map(f => {
              const labels: Record<string, string> = { all: 'Todos', ok: '✅ Normal', low: '⚠️ Baixo', out: '🔴 Zerado' };
              return (
                <button
                  key={f}
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => { setFilter(f); setPage(0); }}
                  style={{ fontSize: 12 }}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Buscar produto..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0); }}
              style={{ paddingLeft: 36, height: 40 }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><div className="loading-spinner" style={{ width: 24, height: 24 }} /></div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Nenhum produto encontrado
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'center' }}>Estoque Atual</th>
                  <th style={{ textAlign: 'center' }}>Estoque Mín.</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Valor Custo</th>
                  <th style={{ textAlign: 'right' }}>Valor Venda</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => {
                  const isOut = p.currentStock <= 0;
                  const isLow = !isOut && p.currentStock <= p.minStock;
                  const stockValue = p.salePrice * p.currentStock;
                  const costValue = p.costPrice * p.currentStock;
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{p.name}</div>
                        {p.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {p.sku}</div>}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{p.categoryName || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontWeight: 600,
                          color: isOut ? '#ef4444' : isLow ? '#f59e0b' : 'var(--text-primary)',
                        }}>
                          {formatQty(p.currentStock)} {p.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                        {formatQty(p.minStock)} {p.unit}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {isOut ? (
                          <span className="badge badge-danger" style={{ gap: 4 }}><XCircle size={12} /> Zerado</span>
                        ) : isLow ? (
                          <span className="badge badge-warning" style={{ gap: 4 }}><AlertTriangle size={12} /> Baixo</span>
                        ) : (
                          <span className="badge badge-success" style={{ gap: 4 }}><CheckCircle size={12} /> Normal</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 13 }}>{formatCurrency(costValue)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-400)', fontSize: 13 }}>{formatCurrency(stockValue)}</td>
                    </tr>
                  );
                })}
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
    </div>
  );
};

export default InventoryPage;
