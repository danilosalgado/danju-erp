import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Edit2, Trash2, X, Check, ChevronRight, FolderTree,
  FolderPlus, Folder, FolderOpen, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import type { ApiResponse } from '../../types';

interface Category {
  id: string;
  name: string;
  description: string | null;
  parentId: string | null;
  parentName: string | null;
  active: boolean;
  sortOrder: number;
  children: Category[] | null;
}

const CategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({ name: '', description: '', parentId: '' });

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Category[]>>('/categories/tree');
      setCategories(res.data.data);
    } catch { toast.error('Erro ao carregar categorias'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreate = (parentId?: string) => {
    setEditing(null);
    setForm({ name: '', description: '', parentId: parentId || '' });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({ name: cat.name, description: cat.description || '', parentId: cat.parentId || '' });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        parentId: form.parentId || undefined,
      };
      if (editing) {
        await api.put(`/categories/${editing.id}`, payload);
        toast.success('Categoria atualizada!');
      } else {
        await api.post('/categories', payload);
        toast.success('Categoria criada!');
      }
      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erro ao salvar');
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Desativar "${cat.name}" e suas subcategorias?`)) return;
    try {
      await api.delete(`/categories/${cat.id}`);
      toast.success('Categoria desativada');
      fetchCategories();
    } catch { toast.error('Erro ao desativar'); }
  };

  const renderTree = (items: Category[], depth = 0): React.ReactNode =>
    items.map((cat) => {
      const hasChildren = cat.children && cat.children.length > 0;
      const isExpanded = expandedIds.has(cat.id);

      return (
        <React.Fragment key={cat.id}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 16px',
              paddingLeft: 16 + depth * 28,
              borderBottom: '1px solid var(--border-glass)',
              transition: 'background var(--transition-fast)',
              cursor: hasChildren ? 'pointer' : 'default',
            }}
            onClick={() => hasChildren && toggleExpand(cat.id)}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,102,241,0.03)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ width: 20, display: 'flex', justifyContent: 'center' }}>
              {hasChildren && (
                <ChevronRight
                  size={16}
                  style={{
                    color: 'var(--text-muted)',
                    transition: 'transform var(--transition-fast)',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              )}
            </div>
            <div className={`stat-icon ${depth === 0 ? 'primary' : 'info'}`} style={{ width: 32, height: 32 }}>
              {isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />}
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontWeight: 500 }}>{cat.name}</span>
              {cat.description && (
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  — {cat.description}
                </span>
              )}
            </div>
            <span className={`badge ${cat.active ? 'badge-success' : 'badge-danger'}`}>
              {cat.active ? 'Ativo' : 'Inativo'}
            </span>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/products?categoryId=${cat.id}`)}
                title="Ver produtos desta categoria"><Package size={15} /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => openCreate(cat.id)}
                title="Adicionar subcategoria"><FolderPlus size={15} /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cat)}
                title="Editar"><Edit2 size={15} /></button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cat)}
                title="Desativar" style={{ color: 'var(--danger-400)' }}><Trash2 size={15} /></button>
            </div>
          </div>
          {hasChildren && isExpanded && renderTree(cat.children!, depth + 1)}
        </React.Fragment>
      );
    });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Categorias</h1>
          <p>Organize seus produtos em categorias hierárquicas</p>
        </div>
        <button className="btn btn-primary" onClick={() => openCreate()}>
          <Plus size={18} /> Nova Categoria
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <div className="loading-page"><div className="loading-spinner" style={{ width: 32, height: 32 }} /></div>
        ) : categories.length === 0 ? (
          <div className="empty-state">
            <FolderTree size={64} />
            <h3>Nenhuma categoria cadastrada</h3>
            <p>Crie a primeira categoria para organizar seus produtos</p>
          </div>
        ) : (
          renderTree(categories)
        )}
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3 className="modal-title">{editing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input className="form-input" value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Descrição</label>
                  <textarea className="form-input" rows={3} value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    style={{ resize: 'vertical' }} />
                </div>
                {form.parentId && (
                  <div className="form-group">
                    <label className="form-label">Subcategoria de</label>
                    <input className="form-input" value={form.parentId} disabled />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} /> {editing ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoriesPage;
