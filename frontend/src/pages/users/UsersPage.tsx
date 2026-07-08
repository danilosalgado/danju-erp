import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  UserPlus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type {
  ApiResponse,
  PageResponse,
  User,
  Role,
  CreateUserRequest,
  UpdateUserRequest,
} from '../../types';
import { ROLE_LABELS } from '../../types';

const ROLES: Role[] = ['ADMIN', 'GERENTE', 'CAIXA', 'ESTOQUISTA', 'FINANCEIRO'];

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'CAIXA' as Role,
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: any = { page, size: 15 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const res = await api.get<ApiResponse<PageResponse<User>>>('/users', { params });
      const data = res.data.data;
      setUsers(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
    } catch {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter]);

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', password: '', phone: '', role: 'CAIXA' });
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingUser) {
        const payload: UpdateUserRequest = {};
        if (formData.name !== editingUser.name) payload.name = formData.name;
        if (formData.email !== editingUser.email) payload.email = formData.email;
        if (formData.password) payload.password = formData.password;
        if (formData.phone !== (editingUser.phone || '')) payload.phone = formData.phone;
        if (formData.role !== editingUser.role) payload.role = formData.role;

        await api.put(`/users/${editingUser.id}`, payload);
        toast.success('Usuário atualizado!');
      } else {
        const payload: CreateUserRequest = {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          role: formData.role,
        };
        await api.post('/users', payload);
        toast.success('Usuário criado!');
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao salvar';
      toast.error(msg);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Desativar o usuário "${user.name}"?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Usuário desativado');
      fetchUsers();
    } catch {
      toast.error('Erro ao desativar');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Usuários</h1>
          <p>Gerenciar usuários e permissões do sistema</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <UserPlus size={18} />
          Novo Usuário
        </button>
      </div>

      <div className="table-container">
        <div className="table-toolbar">
          <div className="table-search">
            <Search />
            <input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="form-input form-select"
              style={{ width: 180 }}
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(0);
              }}
            >
              <option value="">Todos os perfis</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-page">
            <div className="loading-spinner" style={{ width: 32, height: 32 }} />
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <UserPlus />
            <h3>Nenhum usuário encontrado</h3>
            <p>Crie o primeiro usuário clicando no botão acima</p>
          </div>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div
                          className="header-avatar"
                          style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}
                        >
                          {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{user.name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td>
                      <span className="badge badge-primary">{ROLE_LABELS[user.role]}</span>
                    </td>
                    <td>
                      <span className={`badge ${user.active ? 'badge-success' : 'badge-danger'}`}>
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openEdit(user)}
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(user)}
                          title="Desativar"
                          style={{ color: 'var(--danger-400)' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-pagination">
              <span>
                Mostrando {users.length} de {totalElements} usuários
              </span>
              <div className="table-pagination-buttons">
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13 }}>
                  {page + 1} / {totalPages || 1}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(page + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="user-name">Nome</label>
                  <input
                    id="user-name"
                    className="form-input"
                    placeholder="Nome completo"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="user-email">E-mail</label>
                  <input
                    id="user-email"
                    type="email"
                    className="form-input"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="user-password">
                    Senha {editingUser && '(deixe vazio para manter)'}
                  </label>
                  <input
                    id="user-password"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="user-phone">Telefone</label>
                  <input
                    id="user-phone"
                    className="form-input"
                    placeholder="(11) 99999-0000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="user-role">Perfil</label>
                  <select
                    id="user-role"
                    className="form-input form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  {editingUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
