import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className={`sidebar-backdrop ${mobileOpen ? 'visible' : ''}`}
        onClick={() => setMobileOpen(false)}
      />
      <div className={`app-main ${collapsed ? 'collapsed' : ''}`}>
        <Header collapsed={collapsed} onMenuClick={() => setMobileOpen(true)} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
