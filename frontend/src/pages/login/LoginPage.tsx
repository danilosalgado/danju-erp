import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import type { ApiResponse, LoginResponse } from '../../types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
      const data = res.data.data;
      login({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.userId,
        name: data.name,
        email: data.email,
        role: data.role,
      });
      toast.success('Bem-vindo(a)!');
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Erro ao fazer login';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🐟</div>
          <span className="login-logo-text">DanJu</span>
        </div>
        <p className="login-subtitle">Pescados & Empório — Sistema de Gestão</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">Senha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  color: 'var(--text-muted)',
                  padding: 4,
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner" />
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
          Credenciais padrão: admin@storepro.com / admin123
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
