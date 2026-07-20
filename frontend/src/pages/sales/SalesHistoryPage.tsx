import React, { useState, useEffect } from 'react';
import {
  Search, Edit2, X, Check, Trash2, Eye, Receipt, ChevronLeft, ChevronRight,
  Calendar, Ban, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse, PageResponse } from '../../types';

interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  totalPrice: number;
  cancelled: boolean;
}

interface SalePayment {
  id: string;
  method: string;
  amount: number;
  changeAmount: number | null;
  installments: number;
  reference: string | null;
}

interface Sale {
  id: string;
  saleNumber: number;
  customerName: string | null;
  userName: string | null;
  subtotal: number;
  total: number;
  status: string;
  notes: string | null;
  items: SaleItem[];
  payments: SalePayment[];
  createdAt: string;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const methodLabels: Record<string, string> = {
  DINHEIRO: '💵 Dinheiro',
  CARTAO_CREDITO: '💳 Crédito',
  CARTAO_DEBITO: '💳 Débito',
  PIX: '📱 PIX',
};

const SalesHistoryPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchSales = async () => {
    setLoading(true);
    try {
      const params: any = { page, size: 15 };
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = new Date(startDate).toISOString();
      if (endDate) params.endDate = new Date(endDate + 'T23:59:59').toISOString();
      const res = await api.get<ApiResponse<PageResponse<Sale>>>('/sales', { params });
      setSales(res.data.data.content);
      setTotal(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error('Erro ao carregar vendas'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSales(); }, [page, statusFilter, startDate, endDate]);

  const handleCancel = async (sale: Sale) => {
    if (!confirm(`Cancelar venda #${sale.saleNumber}? O estoque será restaurado.`)) return;
    try {
      await api.post(`/sales/${sale.id}/cancel`);
      toast.success('Venda cancelada');
      fetchSales();
      setSelectedSale(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao cancelar');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Histórico de Vendas</h1>
          <p>Acompanhe e edite as vendas realizadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 150 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Data Início</label>
            <input type="date" className="form-input" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(0); }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 150 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Data Fim</label>
            <input type="date" className="form-input" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(0); }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: 150 }}>
            <label className="form-label" style={{ fontSize: 12 }}>Status</label>
            <select className="form-input form-select" value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <option value="">Todos</option>
              <option value="FINALIZADA">Finalizada</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
          {(startDate || endDate || statusFilter) && (
            <button className="btn btn-ghost" onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter(''); setPage(0); }}>
              <X size={16} /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Sales Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-page"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : sales.length === 0 ? (
          <div className="empty-state">
            <Receipt size={64} />
            <h3>Nenhuma venda encontrada</h3>
            <p>Ajuste os filtros ou realize vendas no PDV</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Data</th>
                  <th>Operador</th>
                  <th>Itens</th>
                  <th>Pagamento</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} style={{ opacity: s.status === 'CANCELADA' ? 0.5 : 1 }}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>#{s.saleNumber}</td>
                    <td>{formatDate(s.createdAt)}</td>
                    <td>{s.userName || '—'}</td>
                    <td>{s.items?.length || 0} itens</td>
                    <td>
                      {s.payments?.map((p, i) => (
                        <span key={i} className="badge badge-info" style={{ marginRight: 4, fontSize: 11 }}>
                          {methodLabels[p.method] || p.method}
                        </span>
                      ))}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent-400)' }}>
                      {formatCurrency(s.total)}
                    </td>
                    <td>
                      <span className={`badge ${s.status === 'FINALIZADA' ? 'badge-success' : 'badge-danger'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelectedSale(s)}
                          title="Ver detalhes"><Eye size={15} /></button>
                        {s.status !== 'CANCELADA' && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleCancel(s)}
                            title="Cancelar venda" style={{ color: 'var(--danger-400)' }}><Ban size={15} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} vendas encontradas</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft size={16} /> Anterior
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: 13 }}>
                    Página {page + 1} de {totalPages}
                  </span>
                  <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    Próxima <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sale Detail Modal */}
      {selectedSale && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedSale(null)}>
          <div className="modal" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                Venda #{selectedSale.saleNumber}
                <span className={`badge ${selectedSale.status === 'FINALIZADA' ? 'badge-success' : 'badge-danger'}`}
                  style={{ marginLeft: 12 }}>{selectedSale.status}</span>
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedSale(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Data</div>
                  <div style={{ fontWeight: 500 }}>{formatDate(selectedSale.createdAt)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Operador</div>
                  <div style={{ fontWeight: 500 }}>{selectedSale.userName || '—'}</div>
                </div>
              </div>

              <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-secondary)' }}>Itens</h4>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--border-glass)' }}>
                {selectedSale.items?.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
                    borderBottom: i < selectedSale.items.length - 1 ? '1px solid var(--border-glass)' : 'none',
                    textDecoration: item.cancelled ? 'line-through' : 'none',
                    opacity: item.cancelled ? 0.5 : 1,
                  }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{item.productName}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 13 }}>
                        {item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(item.totalPrice)}</span>
                  </div>
                ))}
              </div>

              <h4 style={{ fontSize: 14, marginBottom: 8, color: 'var(--text-secondary)' }}>Pagamentos</h4>
              <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', marginBottom: 16, border: '1px solid var(--border-glass)' }}>
                {selectedSale.payments?.map((pay, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', padding: '10px 14px',
                    borderBottom: i < selectedSale.payments.length - 1 ? '1px solid var(--border-glass)' : 'none',
                  }}>
                    <span>{methodLabels[pay.method] || pay.method}</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(pay.amount)}</span>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'right', fontSize: 20, fontWeight: 700, color: 'var(--accent-400)' }}>
                Total: {formatCurrency(selectedSale.total)}
              </div>
            </div>
            <div className="modal-footer">
              {selectedSale.status !== 'CANCELADA' && (
                <button className="btn btn-secondary" style={{ color: 'var(--danger-400)' }}
                  onClick={() => handleCancel(selectedSale)}>
                  <Ban size={16} /> Cancelar Venda
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedSale(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistoryPage;
