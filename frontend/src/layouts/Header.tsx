import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ROLE_LABELS } from '../types';
import toast from 'react-hot-toast';

interface HeaderProps {
  collapsed: boolean;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ collapsed, title }) => {
  const navigate = useNavigate();
  const { name, email, role, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = name
    ? name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleLogout = () => {
    logout();
    toast.success('Até logo!');
    navigate('/login');
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <header className={`header ${collapsed ? 'collapsed' : ''}`}>
      <div className="header-left">
        {title && <h2 className="header-title">{title}</h2>}
      </div>

      <div className="header-right">
        <button className="btn btn-ghost btn-icon" title="Notificações">
          <Bell size={20} />
        </button>

        <div ref={menuRef} style={{ position: 'relative' }}>
          <div className="header-user" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="header-avatar">{initials}</div>
            <div className="header-user-info">
              <div className="header-user-name">{name}</div>
              <div className="header-user-role">
                {role ? ROLE_LABELS[role] : ''}
              </div>
            </div>
          </div>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: 200,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-xl)',
                zIndex: 200,
                overflow: 'hidden',
                animation: 'fadeIn 150ms ease-out',
              }}
            >
              <button
                className="nav-item"
                style={{ width: '100%', borderRadius: 0 }}
                onClick={() => { setMenuOpen(false); navigate('/settings'); }}
              >
                <Settings size={16} /> <span>Configurações</span>
              </button>
              <button
                className="nav-item"
                style={{ width: '100%', borderRadius: 0, color: 'var(--danger-400)' }}
                onClick={handleLogout}
              >
                <LogOut size={16} /> <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
