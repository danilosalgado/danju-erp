import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/login/LoginPage';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './auth/ProtectedRoute';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import ProductsPage from './pages/products/ProductsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import SuppliersPage from './pages/suppliers/SuppliersPage';
import PDVPage from './pages/sales/PDVPage';
import SalesHistoryPage from './pages/sales/SalesHistoryPage';
import InvoiceImportPage from './pages/invoices/InvoiceImportPage';
import FinancialPage from './pages/financial/FinancialPage';
import PurchasesPage from './pages/purchases/PurchasesPage';

// Placeholder for modules not yet built
const ComingSoon: React.FC<{ title: string }> = ({ title }) => (
  <div>
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>Este módulo está em desenvolvimento</p>
      </div>
    </div>
    <div className="card">
      <div className="empty-state">
        <h3>🚧 Em Construção</h3>
        <p style={{ marginTop: 8 }}>
          Este módulo será implementado nas próximas fases do projeto.
        </p>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'GERENTE']}><UsersPage /></ProtectedRoute>
        } />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/customers" element={<ComingSoon title="Clientes" />} />
        <Route path="/inventory" element={<ComingSoon title="Estoque" />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/sales" element={<PDVPage />} />
        <Route path="/sales-history" element={<SalesHistoryPage />} />
        <Route path="/financial" element={<FinancialPage />} />
        <Route path="/invoices" element={<InvoiceImportPage />} />
        <Route path="/reports" element={<ComingSoon title="Relatórios" />} />
        <Route path="/audit" element={<ComingSoon title="Auditoria" />} />
        <Route path="/settings" element={<ComingSoon title="Configurações" />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
