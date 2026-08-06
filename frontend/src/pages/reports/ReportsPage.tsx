import React, { useEffect, useState } from 'react';
import {
  BarChart3, Receipt, Users, Package, Download, DollarSign,
  TrendingUp, Ban, Percent,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse, PageResponse } from '../../types';

interface PaymentMethodStat { method: string; total: number; count: number }
interface DailyStat { date: string; revenue: number; count: number }
interface ReportSummary {
  totalRevenue: number;
  totalSales: number;
  averageTicket: number;
  totalDiscount: number;
  cancelledSales: number;
  byPaymentMethod: PaymentMethodStat[];
  dailySales: DailyStat[];
}
interface OperatorStat {
  userId: string; userName: string; salesCount: number; revenue: number; averageTicket: number;
}
interface ProductStat {
  productId: string; productName: string; quantitySold: number; revenue: number;
}
interface SaleListItem {
  id: string; saleNumber: number; customerName: string | null; userName: string | null;
  total: number; status: string; items: unknown[]; payments: { method: string }[]; createdAt: string;
}

const TABS = [
  { key: 'resumo', label: 'Resumo', icon: BarChart3 },
  { key: 'extrato', label: 'Extrato de Vendas', icon: Receipt },
  { key: 'operador', label: 'Por Operador', icon: Users },
  { key: 'produtos', label: 'Produtos', icon: Package },
] as const;

const methodLabels: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  PIX: 'PIX',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const todayStr = () => new Date().toISOString().slice(0, 10);

const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const content = rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(';')).join('\n');
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const ReportsPage: React.FC = () => {
  const [tab, setTab] = useState<typeof TABS[number]['key']>('resumo');
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [operators, setOperators] = useState<OperatorStat[]>([]);
  const [products, setProducts] = useState<ProductStat[]>([]);
  const [productLimit, setProductLimit] = useState(20);

  const [sales, setSales] = useState<SaleListItem[]>([]);
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesTotalPages, setSalesTotalPages] = useState(0);
  const [salesPage, setSalesPage] = useState(0);
  const [exporting, setExporting] = useState(false);

  const dateParams = () => ({
    startDate: new Date(startDate + 'T00:00:00').toISOString(),
    endDate: new Date(endDate + 'T23:59:59').toISOString(),
  });

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<ReportSummary>>('/reports/summary', { params: dateParams() });
      setSummary(res.data.data);
    } catch { toast.error('Erro ao carregar o resumo de vendas'); }
    finally { setLoading(false); }
  };

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<OperatorStat[]>>('/reports/by-operator', { params: dateParams() });
      setOperators(res.data.data);
    } catch { toast.error('Erro ao carregar estatísticas por operador'); }
    finally { setLoading(false); }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<ProductStat[]>>('/reports/top-products', { params: { ...dateParams(), limit: productLimit } });
      setProducts(res.data.data);
    } catch { toast.error('Erro ao carregar produtos mais vendidos'); }
    finally { setLoading(false); }
  };

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<PageResponse<SaleListItem>>>('/sales', {
        params: { ...dateParams(), page: salesPage, size: 15 },
      });
      setSales(res.data.data.content);
      setSalesTotal(res.data.data.totalElements);
      setSalesTotalPages(res.data.data.totalPages);
    } catch { toast.error('Erro ao carregar extrato de vendas'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (tab === 'resumo') fetchSummary();
    if (tab === 'operador') fetchOperators();
    if (tab === 'produtos') fetchProducts();
    if (tab === 'extrato') fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, startDate, endDate, salesPage, productLimit]);

  useEffect(() => { setSalesPage(0); }, [startDate, endDate]);

  const exportExtrato = async () => {
    setExporting(true);
    try {
      const res = await api.get<ApiResponse<PageResponse<SaleListItem>>>('/sales', {
        params: { ...dateParams(), page: 0, size: 5000 },
      });
      const rows: (string | number)[][] = [
        ['Venda', 'Data', 'Operador', 'Cliente', 'Itens', 'Pagamento', 'Total', 'Status'],
        ...res.data.data.content.map(s => [
          s.saleNumber,
          new Date(s.createdAt).toLocaleString('pt-BR'),
          s.userName || '—',
          s.customerName || '—',
          s.items?.length ?? 0,
          s.payments?.map(p => methodLabels[p.method] || p.method).join(' + ') || '—',
          Number(s.total).toFixed(2).replace('.', ','),
          s.status,
        ]),
      ];
      downloadCsv(`extrato-vendas_${startDate}_a_${endDate}.csv`, rows);
      toast.success('Extrato exportado');
    } catch { toast.error('Erro ao exportar extrato'); }
    finally { setExporting(false); }
  };

  const chartData = (summary?.dailySales ?? []).map(s => ({ date: formatDate(s.date), revenue: s.revenue }));
  const maxOperatorRevenue = Math.max(1, ...operators.map(o => o.revenue));
  const maxProductRevenue = Math.max(1, ...products.map(p => p.revenue));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Relatórios</h1>
          <p>Vendas, extrato e estatísticas do período</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label className="form-label" style={{ fontSize: 12 }}>De</label>
            <input type="date" className="form-input" value={startDate} max={endDate}
              onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Até</label>
            <input type="date" className="form-input" value={endDate} min={startDate} max={todayStr()}
              onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <div className="filter-actions">
            {[
              { label: 'Hoje', from: todayStr(), to: todayStr() },
              { label: 'Este mês', from: firstDayOfMonth(), to: todayStr() },
            ].map(p => (
              <button key={p.label} className="btn btn-ghost btn-sm" onClick={() => { setStartDate(p.from); setEndDate(p.to); }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid var(--border-glass)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="btn btn-ghost"
            style={{
              borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
              borderBottom: tab === t.key ? '2px solid var(--accent-400)' : '2px solid transparent',
              color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: tab === t.key ? 600 : 400,
            }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <span className="loading-spinner" style={{ width: 32, height: 32 }} />
        </div>
      )}

      {/* Resumo */}
      {!loading && tab === 'resumo' && summary && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon primary"><DollarSign size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Faturamento no período</div>
                <div className="stat-value">{formatCurrency(summary.totalRevenue)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon accent"><Receipt size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Vendas finalizadas</div>
                <div className="stat-value">{summary.totalSales}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon info"><TrendingUp size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Ticket médio</div>
                <div className="stat-value">{formatCurrency(summary.averageTicket)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon warning"><Percent size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Descontos concedidos</div>
                <div className="stat-value">{formatCurrency(summary.totalDiscount)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon danger"><Ban size={24} /></div>
              <div className="stat-info">
                <div className="stat-label">Vendas canceladas</div>
                <div className="stat-value">{summary.cancelledSales}</div>
              </div>
            </div>
          </div>

          <div className="split-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Faturamento por dia</h3>
              </div>
              <div style={{ height: 280, padding: '0 8px 8px' }}>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.06)" />
                      <XAxis dataKey="date" tick={{ fill: '#4a7a94', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'rgba(6,182,212,0.1)' }} />
                      <YAxis
                        tick={{ fill: '#4a7a94', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v.toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{ background: 'rgba(10,20,14,0.96)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 12, fontSize: 13 }}
                        formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                      />
                      <Bar dataKey="revenue" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>Nenhuma venda no período selecionado</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Formas de pagamento</h3>
              </div>
              <div style={{ padding: 16 }}>
                {summary.byPaymentMethod.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Sem dados no período</p>
                ) : summary.byPaymentMethod.map(p => {
                  const pct = summary.totalRevenue > 0 ? (p.total / summary.totalRevenue) * 100 : 0;
                  return (
                    <div key={p.method} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                        <span>{methodLabels[p.method] || p.method}</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(p.total)}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-400)' }} />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{p.count} vendas · {pct.toFixed(1)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Extrato */}
      {!loading && tab === 'extrato' && (
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{salesTotal} vendas no período</span>
            <button className="btn btn-secondary btn-sm" onClick={exportExtrato} disabled={exporting}>
              <Download size={14} /> {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
          </div>
          {sales.length === 0 ? (
            <div className="empty-state">
              <Receipt size={64} />
              <h3>Nenhuma venda no período</h3>
              <p>Ajuste as datas para ver o extrato</p>
            </div>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Data</th>
                    <th>Operador</th>
                    <th>Cliente</th>
                    <th>Pagamento</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(s => (
                    <tr key={s.id} style={{ opacity: s.status === 'CANCELADA' ? 0.5 : 1 }}>
                      <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{s.saleNumber}</td>
                      <td>{new Date(s.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{s.userName || '—'}</td>
                      <td>{s.customerName || '—'}</td>
                      <td>{s.payments?.map((p, i) => (
                        <span key={i} className="badge badge-info" style={{ marginRight: 4, fontSize: 11 }}>
                          {methodLabels[p.method] || p.method}
                        </span>
                      ))}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-400)' }}>{formatCurrency(s.total)}</td>
                      <td>
                        <span className={`badge ${s.status === 'FINALIZADA' ? 'badge-success' : 'badge-danger'}`}>{s.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {salesTotalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-glass)' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Página {salesPage + 1} de {salesTotalPages}</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" disabled={salesPage === 0} onClick={() => setSalesPage(salesPage - 1)}>Anterior</button>
                    <button className="btn btn-ghost btn-sm" disabled={salesPage >= salesTotalPages - 1} onClick={() => setSalesPage(salesPage + 1)}>Próxima</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Por Operador */}
      {!loading && tab === 'operador' && (
        <div className="card">
          {operators.length === 0 ? (
            <div className="empty-state">
              <Users size={64} />
              <h3>Nenhuma venda no período</h3>
            </div>
          ) : (
            <div style={{ padding: 16 }}>
              {operators.map(op => {
                const pct = (op.revenue / maxOperatorRevenue) * 100;
                return (
                  <div key={op.userId} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{op.userName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          {op.salesCount} vendas · ticket médio {formatCurrency(op.averageTicket)}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--accent-400)' }}>{formatCurrency(op.revenue)}</div>
                    </div>
                    <div style={{ height: 8, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary-500), var(--accent-400))' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Produtos */}
      {!loading && tab === 'produtos' && (
        <div className="table-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Top {productLimit} produtos por faturamento</span>
            <select className="form-input form-select" style={{ width: 140 }} value={productLimit} onChange={e => setProductLimit(Number(e.target.value))}>
              <option value={10}>Top 10</option>
              <option value={20}>Top 20</option>
              <option value={50}>Top 50</option>
            </select>
          </div>
          {products.length === 0 ? (
            <div className="empty-state">
              <Package size={64} />
              <h3>Nenhuma venda no período</h3>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Produto</th>
                  <th style={{ textAlign: 'right' }}>Qtd. vendida</th>
                  <th style={{ textAlign: 'right' }}>Faturamento</th>
                  <th style={{ width: 160 }}></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.productId}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 500 }}>{p.productName}</td>
                    <td style={{ textAlign: 'right' }}>{p.quantitySold}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-400)' }}>{formatCurrency(p.revenue)}</td>
                    <td>
                      <div style={{ height: 6, background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${(p.revenue / maxProductRevenue) * 100}%`, height: '100%', background: 'var(--accent-400)' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
