import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC = () => {
  const location = useLocation();
  const isEmbedded = new URLSearchParams(location.search).get('embedded') === 'true';

  if (isEmbedded) {
    return (
      <div className="app-shell embedded">
        <main className="main-content" style={{ marginLeft: 0, padding: '20px' }}>
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
