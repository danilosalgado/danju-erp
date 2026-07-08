import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  FolderTree,
  Truck,
  Warehouse,
  ShoppingCart,
  UserCircle,
  DollarSign,
  FileText,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight,
  Receipt,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  {
    section: 'Principal',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/sales', icon: Receipt, label: 'PDV / Vendas' },
    ],
  },
  {
    section: 'Cadastros',
    items: [
      { to: '/products', icon: Package, label: 'Produtos' },
      { to: '/categories', icon: FolderTree, label: 'Categorias' },
      { to: '/suppliers', icon: Truck, label: 'Fornecedores' },
      { to: '/customers', icon: UserCircle, label: 'Clientes' },
    ],
  },
  {
    section: 'Operações',
    items: [
      { to: '/inventory', icon: Warehouse, label: 'Estoque' },
      { to: '/purchases', icon: ShoppingCart, label: 'Compras' },
    ],
  },
  {
    section: 'Financeiro',
    items: [
      { to: '/financial', icon: DollarSign, label: 'Financeiro' },
      { to: '/invoices', icon: FileText, label: 'Notas Fiscais' },
      { to: '/reports', icon: BarChart3, label: 'Relatórios' },
    ],
  },
  {
    section: 'Sistema',
    items: [
      { to: '/users', icon: Users, label: 'Usuários' },
      { to: '/audit', icon: Shield, label: 'Auditoria' },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">🐟</div>
        <span className="sidebar-brand">DanJu</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((section) => (
          <div key={section.section} className="nav-section">
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `nav-item ${isActive ? 'active' : ''}`
                }
                end={item.to === '/'}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-toggle" onClick={onToggle}>
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Recolher</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
