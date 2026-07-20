import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight,
  DollarSign, TrendingDown, CheckCircle, Clock, Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse, PageResponse } from '../../types';

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  paid: boolean;
  recurrence: string;
  notes: string | null;
  createdAt: string;
}

interface Summary {
  totalExpenses: number;
  totalPaid: number;
  totalPending: number;
}

const CATEGORIES = [
  { value: 'ALUGUEL', label: '🏠 Aluguel', color: '#6366f1' },
  { value: 'ENERGIA', label: '💡 Energia', color: '#f59e0b' },
  { value: 'AGUA', label: '💧 Água', color: '#06b6d4' },
  { value: 'INTERNET', label: '🌐 Internet', color: '#8b5cf6' },
  { value: 'SALARIOS', label: '👥 Salários', color: '#10b981' },
  { value: 'IMPOSTOS', label: '📋 Impostos', color: '#ef4444' },
  { value: 'FORNECEDORES', label: '🚚 Fornecedores', color: '#f97316' },
  { value: 'MANUTENCAO', label: '🔧 Manutenção', color: '#64748b' },
  { value: 'OUTROS', label: '📦 Outros', color: '#94a3b8' },
];

const RECURRENCE = [
  { value: 'UNICA', label: 'Única' },
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'SEMANAL', label: 'Semanal' },
];

const getCategoryInfo = (value: string) =>
  CATEGORIES.find(c => c.value === value) || { value, label: value, color: '#94a3b8' };

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');

const FinancialPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalExpenses: 0, totalPaid: 0, totalPending: 0 });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState<string>('');

  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());

  const [form, setForm] = useState({
    description: '', category: 'OUTROS', amount: '', dueDate: '',
    paidDate: '', paid: false, recurrence: 'UNICA', notes: '',
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(filterYear, filterMonth, 0).getDate();
      const endDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const params: any = { page, size: 20, startDate, endDate };
      if (categoryFilter) params.category = categoryFilter;
      if (paidFilter !== '') params.paid = paidFilter === 'true';
      const res = await api.get<ApiResponse<PageResponse<Expense>>>('/expenses', { params });
      setExpenses(res.data.data.content);
      setTotal(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error('Erro ao carregar despesas'); }
    finally { setLoading(false); }
  };

  const fetchSummary = async () => {
    try {
      const res = await api.get<ApiResponse<Summary>>(`/expenses/summary?month=${filterMonth}&year=${filterYear}`);
      setSummary(res.data.data);
    } catch {}
  };

  useEffect(() => { fetchExpenses(); fetchSummary(); }, [page, categoryFilter, paidFilter, filterMonth, filterYear]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      description: '', category: 'OUTROS', amount: '', dueDate: '',
      paidDate: '', paid: false, recurrence: 'UNICA', notes: '',
    });
    setModalOpen(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({
      description: e.description, category: e.category, amount: String(e.amount),
      dueDate: e.dueDate, paidDate: e.paidDate || '', paid: e.paid,
      recurrence: e.recurrence || 'UNICA', notes: e.notes || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    try {
      const payload = {
        description: form.description,
        category: form.category,
        amount: parseFloat(form.amount),
        dueDate: form.dueDate,
        paidDate: form.paidDate || null,
        paid: form.paid,
        recurrence: form.recurrence,
        notes: form.notes || null,
      };
      if (editing) {
        await api.put(`/expenses/${editing.id}`, payload);
        toast.success('Despesa atualizada!');
      } else {
        await api.post('/expenses', payload);
        toast.success('Despesa cadastrada!');
      }
      setModalOpen(false);
      fetchExpenses();
      fetchSummary();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleMarkPaid = async (e: Expense) => {
    try {
      await api.post(`/expenses/${e.id}/pay`);
      toast.success('Despesa marcada como paga!');
      fetchExpenses();
      fetchSummary();
    } catch { toast.error('Erro ao marcar como paga'); }
  };

  const handleDelete = async (e: Expense) => {
    if (!confirm(`Excluir despesa "${e.description}"?`)) return;
    try {
      await api.delete(`/expenses/${e.id}`);
      toast.success('Despesa excluída');
      fetchExpenses();
      fetchSummary();
    } catch { toast.error('Erro ao excluir'); }
  };

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Financeiro — Despesas</h1>
          <p>Controle as despesas e contas a pagar do negócio</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Nova Despesa
        </button>
      </div>

      {/* Month selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          if (filterMonth === 1) { setFilterMonth(12); setFilterYear(filterYear - 1); }
          else setFilterMonth(filterMonth - 1);
          setPage(0);
        }}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 600, fontSize: 16, minWidth: 120, textAlign: 'center' }}>
          {monthNames[filterMonth - 1]} {filterYear}
        </span>
        <button className="btn btn-ghost btn-sm" onClick={() => {
          if (filterMonth === 12) { setFilterMonth(1); setFilterYear(filterYear + 1); }
          else setFilterMonth(filterMonth + 1);
          setPage(0);
        }}><ChevronRight size={16} /></button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-icon warning"><DollarSign size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Total Despesas</div>
            <div className="stat-value">{formatCurrency(summary.totalExpenses)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon primary"><CheckCircle size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Pagas</div>
            <div className="stat-value">{formatCurrency(summary.totalPaid)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon danger"><Clock size={24} /></div>
          <div className="stat-info">
            <div className="stat-label">Pendentes</div>
            <div className="stat-value">{formatCurrency(summary.totalPending)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select className="form-input form-select" style={{ width: 160 }}
          value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}>
          <option value="">Todas categorias</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select className="form-input form-select" style={{ width: 140 }}
          value={paidFilter} onChange={(e) => { setPaidFilter(e.target.value); setPage(0); }}>
          <option value="">Todos status</option>
          <option value="true">✅ Pagas</option>
          <option value="false">⏳ Pendentes</option>
        </select>
      </div>

      {/* Expenses Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-page"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : expenses.length === 0 ? (
          <div className="empty-state">
            <Wallet size={64} />
            <h3>Nenhuma despesa encontrada</h3>
            <p>Cadastre a primeira despesa clicando no botão acima</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: 'right' }}>Valor</th>
                  <th>Vencimento</th>
                  <th>Recorrência</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => {
                  const catInfo = getCategoryInfo(e.category);
                  const overdue = !e.paid && new Date(e.dueDate + 'T00:00:00') < new Date();
                  return (
                    <tr key={e.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{e.description}</div>
                        {e.notes && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{e.notes}</div>}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: `${catInfo.color}20`, color: catInfo.color,
                          border: `1px solid ${catInfo.color}40`,
                        }}>{catInfo.label}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--danger-400)' }}>
                        {formatCurrency(e.amount)}
                      </td>
                      <td style={{ color: overdue ? 'var(--danger-400)' : 'inherit', fontWeight: overdue ? 600 : 400 }}>
                        {formatDate(e.dueDate)}
                        {overdue && <span style={{ fontSize: 11, marginLeft: 4 }}>⚠️</span>}
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {RECURRENCE.find(r => r.value === e.recurrence)?.label || e.recurrence}
                      </td>
                      <td>
                        <span className={`badge ${e.paid ? 'badge-success' : 'badge-warning'}`}>
                          {e.paid ? '✅ Paga' : '⏳ Pendente'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="flex gap-1" style={{ justifyContent: 'flex-end' }}>
                          {!e.paid && (
                            <button className="btn btn-ghost btn-sm" onClick={() => handleMarkPaid(e)}
                              title="Marcar como paga" style={{ color: 'var(--success-400)' }}>
                              <CheckCircle size={15} />
                            </button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)}
                            title="Editar"><Edit2 size={15} /></button>
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e)}
                            title="Excluir" style={{ color: 'var(--danger-400)' }}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--border-glass)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} despesas</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: 13 }}>Página {page + 1} de {totalPages}</span>
                  <button className="btn btn-ghost btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(ev) => ev.target === ev.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Despesa' : 'Nova Despesa'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Descrição *</label>
                  <input className="form-input" value={form.description}
                    onChange={(ev) => setForm({ ...form, description: ev.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Categoria *</label>
                    <select className="form-input form-select" value={form.category}
                      onChange={(ev) => setForm({ ...form, category: ev.target.value })}>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Valor *</label>
                    <input type="number" step="0.01" className="form-input" value={form.amount}
                      onChange={(ev) => setForm({ ...form, amount: ev.target.value })} required />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Data de Vencimento *</label>
                    <input type="date" className="form-input" value={form.dueDate}
                      onChange={(ev) => setForm({ ...form, dueDate: ev.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recorrência</label>
                    <select className="form-input form-select" value={form.recurrence}
                      onChange={(ev) => setForm({ ...form, recurrence: ev.target.value })}>
                      {RECURRENCE.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" checked={form.paid}
                        onChange={(ev) => setForm({ ...form, paid: ev.target.checked })} />
                      Já foi paga
                    </label>
                  </div>
                  {form.paid && (
                    <div className="form-group">
                      <label className="form-label">Data do Pagamento</label>
                      <input type="date" className="form-input" value={form.paidDate}
                        onChange={(ev) => setForm({ ...form, paidDate: ev.target.value })} />
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea className="form-input" rows={2} value={form.notes}
                    onChange={(ev) => setForm({ ...form, notes: ev.target.value })}
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
    </div>
  );
};

export default FinancialPage;
