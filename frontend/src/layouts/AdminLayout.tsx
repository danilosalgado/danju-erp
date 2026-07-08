import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`app-main ${collapsed ? 'collapsed' : ''}`}>
        <Header collapsed={collapsed} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
