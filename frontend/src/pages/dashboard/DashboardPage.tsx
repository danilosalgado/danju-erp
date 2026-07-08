import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import api from '../../api/client';
import type { ApiResponse } from '../../types';

interface DailySale {
  date: string;
  revenue: number;
  count: number;
}

interface LowStockProduct {
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
}

interface DashboardData {
  todayRevenue: number;
  monthRevenue: number;
  todaySales: number;
  monthSales: number;
  averageTicket: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCustomers: number;
  criticalStock: LowStockProduct[];
  dailySales: DailySale[];
  previousMonthRevenue: number;
  previousMonthSales: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<ApiResponse<DashboardData>>('/dashboard')
      .then(res => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <span className="loading-spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  const d = data!;

  const monthChange = d.previousMonthRevenue > 0
    ? (((d.monthRevenue - d.previousMonthRevenue) / d.previousMonthRevenue) * 100).toFixed(1)
    : '0';
  const monthPositive = Number(monthChange) >= 0;

  const stats = [
    {
      label: 'Faturamento Hoje',
      value: formatCurrency(d.todayRevenue ?? 0),
      change: `${d.todaySales} vendas`,
      positive: true,
      icon: DollarSign,
      color: 'primary',
    },
    {
      label: 'Faturamento do Mês',
      value: formatCurrency(d.monthRevenue ?? 0),
      change: `${monthPositive ? '+' : ''}${monthChange}%`,
      positive: monthPositive,
      icon: TrendingUp,
      color: 'accent',
    },
    {
      label: 'Vendas no Mês',
      value: String(d.monthSales ?? 0),
      change: `${d.previousMonthSales} mês anterior`,
      positive: d.monthSales >= d.previousMonthSales,
      icon: ShoppingCart,
      color: 'info',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(d.averageTicket ?? 0),
      change: `${d.totalProducts} produtos`,
      positive: true,
      icon: DollarSign,
      color: 'warning',
    },
  ];

  const chartData = (d.dailySales ?? []).map(s => ({
    date: formatDate(s.date),
    revenue: s.revenue,
    count: s.count,
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral do seu negócio</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className={`stat-icon ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div className="stat-info">
              <div className="stat-label">{stat.label}</div>
              <div className="stat-value">{stat.value}</div>
              <span className={`stat-change ${stat.positive ? 'positive' : 'negative'}`}>
                {stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Revenue Chart */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Vendas — Últimos 30 dias</h3>
            <span className="badge badge-info">
              <BarChart3 size={14} style={{ marginRight: 4 }} /> Faturamento
            </span>
          </div>
          <div style={{ height: 300, padding: '0 8px 8px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.06)" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#4a7a94', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(6,182,212,0.1)' }}
                  />
                  <YAxis
                    tick={{ fill: '#4a7a94', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10,20,14,0.96)',
                      border: '1px solid rgba(6,182,212,0.15)',
                      borderRadius: 12,
                      fontSize: 13,
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Faturamento']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Nenhuma venda registrada nos últimos 30 dias</p>
              </div>
            )}
          </div>
        </div>

        {/* Monthly Comparison */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Comparação Mensal</h3>
          </div>
          <div style={{ padding: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Mês Atual</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent-400)' }}>
                {formatCurrency(d.monthRevenue ?? 0)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.monthSales} vendas</div>
            </div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 4 }}>Mês Anterior</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {formatCurrency(d.previousMonthRevenue ?? 0)}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{d.previousMonthSales} vendas</div>
            </div>
            <div style={{
              textAlign: 'center',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: monthPositive ? 'rgba(6,182,212,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${monthPositive ? 'rgba(6,182,212,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: monthPositive ? '#06b6d4' : '#ef4444' }}>
                {monthPositive ? '↑' : '↓'} {monthChange}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {monthPositive ? 'Crescimento' : 'Queda'} em relação ao mês anterior
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Stock */}
      {(d.criticalStock ?? []).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Estoque Crítico</h3>
            <span className="badge badge-danger">{d.criticalStock.length} alertas</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {d.criticalStock.map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-glass)',
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`stat-icon ${item.currentStock === 0 ? 'danger' : 'warning'}`}
                    style={{ width: 36, height: 36 }}
                  >
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 14 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Mínimo: {item.minStock} unidades
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: item.currentStock === 0 ? 'var(--danger-400)' : 'var(--warning-400)',
                    }}
                  >
                    {item.currentStock}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>em estoque</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
