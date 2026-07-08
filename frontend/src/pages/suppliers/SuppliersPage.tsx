import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Check, ChevronLeft, ChevronRight,
  Truck, MapPin, Phone, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse, PageResponse } from '../../types';

interface Supplier {
  id: string;
  companyName: string;
  tradeName: string | null;
  cnpj: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  active: boolean;
  avgDeliveryDays: number;
}

const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const [form, setForm] = useState({
    companyName: '', tradeName: '', cnpj: '', phone: '', email: '',
    contactPerson: '', city: '', state: '', notes: '',
    zipCode: '', street: '', number: '', complement: '', neighborhood: '',
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const params: any = { page, size: 15 };
      if (search) params.search = search;
      const res = await api.get<ApiResponse<PageResponse<Supplier>>>('/suppliers', { params });
      setSuppliers(res.data.data.content);
      setTotal(res.data.data.totalElements);
      setTotalPages(res.data.data.totalPages);
    } catch { toast.error('Erro ao carregar fornecedores'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuppliers(); }, [page, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      companyName: '', tradeName: '', cnpj: '', phone: '', email: '',
      contactPerson: '', city: '', state: '', notes: '',
      zipCode: '', street: '', number: '', complement: '', neighborhood: '',
    });
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({
      companyName: s.companyName, tradeName: s.tradeName || '', cnpj: s.cnpj || '',
      phone: s.phone || '', email: s.email || '', contactPerson: s.contactPerson || '',
      city: s.city || '', state: s.state || '', notes: '',
      zipCode: '', street: '', number: '', complement: '', neighborhood: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        companyName: form.companyName,
        tradeName: form.tradeName || undefined,
        cnpj: form.cnpj || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        contactPerson: form.contactPerson || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        notes: form.notes || undefined,
        zipCode: form.zipCode || undefined,
        street: form.street || undefined,
        number: form.number || undefined,
        complement: form.complement || undefined,
        neighborhood: form.neighborhood || undefined,
      };
      if (editing) {
        await api.put(`/suppliers/${editing.id}`, payload);
        toast.success('Fornecedor atualizado!');
      } else {
        await api.post('/suppliers', payload);
        toast.success('Fornecedor cadastrado!');
      }
      setModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Desativar "${s.companyName}"?`)) return;
    try {
      await api.delete(`/suppliers/${s.id}`);
      toast.success('Fornecedor desativado');
      fetchSuppliers();
    } catch { toast.error('Erro ao desativar'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Fornecedores</h1>
          <p>Gerencie seus fornecedores e parceiros comerciais</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={18} /> Novo Fornecedor
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-search">
            <Search />
            <input placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
          </div>
        </div>

        {loading ? (
          <div className="loading-page"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            <Truck size={64} />
            <h3>Nenhum fornecedor encontrado</h3>
            <p>Cadastre o primeiro fornecedor</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Razão Social</th>
                  <th>CNPJ</th>
                  <th>Contato</th>
                  <th>Localização</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="stat-icon accent" style={{ width: 36, height: 36 }}>
                          <Truck size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{s.companyName}</div>
                          {s.tradeName && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.tradeName}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{s.cnpj || '—'}</td>
                    <td>
                      <div style={{ fontSize: 13 }}>
                        {s.contactPerson && <div>{s.contactPerson}</div>}
                        {s.phone && <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                          <Phone size={12} /> {s.phone}
                        </div>}
                      </div>
                    </td>
                    <td>
                      {s.city && s.state ? (
                        <div className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          <MapPin size={14} /> {s.city}/{s.state}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`badge ${s.active ? 'badge-success' : 'badge-danger'}`}>
                        {s.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}><Edit2 size={16} /></button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s)}
                          style={{ color: 'var(--danger-400)' }}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="table-pagination">
              <span>Mostrando {suppliers.length} de {total} fornecedores</span>
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

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Razão Social *</label>
                  <input className="form-input" value={form.companyName}
                    onChange={(e) => setForm({ ...form, companyName: e.target.value })} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Nome Fantasia</label>
                    <input className="form-input" value={form.tradeName}
                      onChange={(e) => setForm({ ...form, tradeName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">CNPJ</label>
                    <input className="form-input" value={form.cnpj}
                      onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Telefone</label>
                    <input className="form-input" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">E-mail</label>
                    <input type="email" className="form-input" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Pessoa de Contato</label>
                  <input className="form-input" value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
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

export default SuppliersPage;
