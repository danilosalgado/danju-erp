import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight,
  UserCircle, MapPin, Phone, Mail, RotateCcw, ShoppingBag, Calendar, FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse, PageResponse } from '../../types';

interface Customer {
  id: string;
  name: string;
  cpfCnpj: string | null;
  phone: string | null;
  email: string | null;
  birthDate: string | null;
  zipCode: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
}

interface PurchaseEntry {
  id: string;
  saleNumber: number | null;
  date: string;
  total: number;
  status: string;
  itemCount: number;
}

interface CustomerSummary {
  customer: Customer;
  totalPurchases: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchaseAt: string | null;
  recentPurchases: PurchaseEntry[];
}

const emptyForm = {
  name: '', cpfCnpj: '', phone: '', email: '', birthDate: '',
  zipCode: '', street: '', number: '', complement: '', neighborhood: '',
  city: '', state: '', notes: '',
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0);

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString('pt-BR') : '—';

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';

// A API devolve birthDate como "1990-05-02"; o input[type=date] quer exatamente
// esse formato, então basta cortar um eventual horário.
const toDateInput = (value: string | null) => (value ? value.slice(0, 10) : '');

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params: any = { page, size: 15 };
      if (search) params.search = search;
      if (!showInactive) params.active = true;
      const res = await api.get<ApiResponse<PageResponse<Customer>>>('/customers', { params });
      setCustomers(res.data.data.content);
      setTotal(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error('Erro ao carregar clientes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCustomers(); }, [page, search, showInactive]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name, cpfCnpj: c.cpfCnpj || '', phone: c.phone || '', email: c.email || '',
      birthDate: toDateInput(c.birthDate), zipCode: c.zipCode || '', street: c.street || '',
      number: c.number || '', complement: c.complement || '', neighborhood: c.neighborhood || '',
      city: c.city || '', state: c.state || '', notes: c.notes || '',
    });
    setModalOpen(true);
  };

  const openDetail = async (c: Customer) => {
    setLoadingSummary(true);
    setSummary({
      customer: c, totalPurchases: 0, totalSpent: 0, averageTicket: 0,
      lastPurchaseAt: null, recentPurchases: [],
    });
    try {
      const res = await api.get<ApiResponse<CustomerSummary>>(`/customers/${c.id}/summary`);
      setSummary(res.data.data);
    } catch {
      toast.error('Erro ao carregar histórico do cliente');
      setSummary(null);
    } finally { setLoadingSummary(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        cpfCnpj: form.cpfCnpj || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        birthDate: form.birthDate || undefined,
        zipCode: form.zipCode || undefined,
        street: form.street || undefined,
        number: form.number || undefined,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        notes: form.notes || undefined,
      };
      if (editing) {
        await api.put(`/customers/${editing.id}`, payload);
        toast.success('Cliente atualizado!');
      } else {
        await api.post('/customers', payload);
        toast.success('Cliente cadastrado!');
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (c: Customer) => {
    if (!confirm(`Desativar "${c.name}"?`)) return;
    try {
      await api.delete(`/customers/${c.id}`);
      toast.success('Cliente desativado');
      fetchCustomers();
    } catch { toast.error('Erro ao desativar'); }
  };

  const handleReactivate = async (c: Customer) => {
    try {
      await api.patch(`/customers/${c.id}/reactivate`);
      toast.success('Cliente reativado');
      fetchCustomers();
    } catch { toast.error('Erro ao reativar'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Clientes</h1>
          <p>Cadastro e histórico de compras dos seus clientes</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Novo Cliente
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
          <div className="table-search">
            <Search />
            <input placeholder="Buscar por nome, CPF/CNPJ ou e-mail..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
          <button
            className={`btn btn-sm ${showInactive ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => { setShowInactive(!showInactive); setPage(0); }}
            style={{ fontSize: 12 }}
          >
            {showInactive ? 'Mostrando inativos' : 'Mostrar inativos'}
          </button>
        </div>

        {loading ? (
          <div className="loading-page"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : customers.length === 0 ? (
          <div className="empty-state">
            <UserCircle size={64} />
            <h3>Nenhum cliente encontrado</h3>
            <p>Cadastre o primeiro cliente</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>CPF/CNPJ</th>
                  <th>Contato</th>
                  <th>Localização</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(c)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="stat-icon accent" style={{ width: 36, height: 36 }}>
                          <UserCircle size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{c.name}</div>
                          {c.birthDate && (
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              Nasc. {formatDate(c.birthDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{c.cpfCnpj || '—'}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>
                        {c.phone && <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          <Phone size={12} /> {c.phone}
                        </div>}
                        {c.email && <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <Mail size={12} /> {c.email}
                        </div>}
                        {!c.phone && !c.email && '—'}
                      </div>
                    </td>
                    <td>
                      {c.city ? (
                        <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          <MapPin size={14} /> {c.city}{c.state ? `/${c.state}` : ''}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${c.active ? 'badge-success' : 'badge-danger'}`}>
                        {c.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        {c.active ? (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeactivate(c)}
                            style={{ color: 'var(--danger-400)' }} title="Desativar">
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleReactivate(c)}
                            title="Reativar">
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-pagination">
              <span>Mostrando {customers.length} de {total} clientes</span>
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

      {/* Ficha do cliente */}
      {summary && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSummary(null)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3 className="modal-title">{summary.customer.name}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setSummary(null)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total gasto</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-400)' }}>
                    {formatCurrency(summary.totalSpent)}
                  </div>
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Compras</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{summary.totalPurchases}</div>
                </div>
                <div className="card" style={{ padding: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Ticket médio</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{formatCurrency(summary.averageTicket)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13, marginBottom: 20 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>CPF/CNPJ: </span>{summary.customer.cpfCnpj || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Telefone: </span>{summary.customer.phone || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>E-mail: </span>{summary.customer.email || '—'}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Nascimento: </span>{formatDate(summary.customer.birthDate)}</div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Endereço: </span>
                  {[summary.customer.street, summary.customer.number, summary.customer.neighborhood,
                    summary.customer.city, summary.customer.state].filter(Boolean).join(', ') || '—'}
                </div>
                <div style={{ gridColumn: '1 / -1' }} className="flex items-center gap-1">
                  <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Última compra: </span>
                  {formatDateTime(summary.lastPurchaseAt)}
                </div>
                {summary.customer.notes && (
                  <div style={{ gridColumn: '1 / -1' }} className="flex gap-1">
                    <FileText size={13} style={{ color: 'var(--text-muted)', marginTop: 2, flexShrink: 0 }} />
                    <span>{summary.customer.notes}</span>
                  </div>
                )}
              </div>

              <h4 style={{ fontSize: 14, marginBottom: 10 }} className="flex items-center gap-2">
                <ShoppingBag size={15} /> Últimas compras
              </h4>
              {loadingSummary ? (
                <div style={{ padding: 20, textAlign: 'center' }}>
                  <div className="loading-spinner" style={{ width: 24, height: 24 }} />
                </div>
              ) : summary.recentPurchases.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  Este cliente ainda não tem compras registradas
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Venda</th>
                      <th>Data</th>
                      <th style={{ textAlign: 'center' }}>Itens</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recentPurchases.map((p) => (
                      <tr key={p.id}>
                        <td style={{ fontFamily: 'monospace' }}>#{p.saleNumber ?? '—'}</td>
                        <td style={{ fontSize: 13 }}>{formatDateTime(p.date)}</td>
                        <td style={{ textAlign: 'center' }}>{p.itemCount}</td>
                        <td>
                          <span className={`badge ${p.status === 'FINALIZADA' ? 'badge-success' : 'badge-danger'}`}>
                            {p.status === 'FINALIZADA' ? 'Finalizada' : 'Cancelada'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSummary(null)}>Fechar</button>
              <button className="btn btn-primary" onClick={() => { const c = summary.customer; setSummary(null); openEdit(c); }}>
                <Edit2 size={16} /> Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cadastro / edição */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input className="form-input" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">CPF/CNPJ</label>
                    <input className="form-input" value={form.cpfCnpj} placeholder="000.000.000-00"
                      onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <input className="form-input" value={form.phone} placeholder="(00) 00000-0000"
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input type="email" className="form-input" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nascimento</label>
                    <input type="date" className="form-input" value={form.birthDate}
                      onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">CEP</label>
                    <input className="form-input" value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rua</label>
                    <input className="form-input" value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Número</label>
                    <input className="form-input" value={form.number}
                      onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Complemento</label>
                    <input className="form-input" value={form.complement}
                      onChange={(e) => setForm({ ...form, complement: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Bairro</label>
                    <input className="form-input" value={form.neighborhood}
                      onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Cidade</label>
                    <input className="form-input" value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">UF</label>
                    <input className="form-input" value={form.state} maxLength={2}
                      onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Observações</label>
                  <textarea className="form-input" rows={3} value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: 'vertical' }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="loading-spinner" /> : <><Check size={16} /> {editing ? 'Salvar' : 'Cadastrar'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
