import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Scan, 
  Search, 
  History, 
  BarChart3, 
  Bell, 
  Settings,
  ChevronDown,
  User as UserIcon
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <Scan size={20} />, label: 'Scan ID', path: '/scan' },
    { icon: <Search size={20} />, label: 'Lookup', path: '/lookup' },
    { icon: <History size={20} />, label: 'History', path: '/history' },
    { icon: <BarChart3 size={20} />, label: 'Reports', path: '/reports' },
    { icon: <Bell size={20} />, label: 'Alerts', path: '/alerts' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 2C8.268 2 2 8.268 2 16C2 23.732 8.268 30 16 30C23.732 30 30 23.732 30 16C30 8.268 23.732 2 16 2ZM16 28C9.373 28 4 22.627 4 16C4 9.373 9.373 4 16 4C22.627 4 28 9.373 28 16C28 22.627 22.627 28 16 28Z" fill="var(--gold-primary)"/>
          <path d="M16 8C11.582 8 8 11.582 8 16C8 20.418 11.582 24 16 24C20.418 24 24 20.418 24 16C24 11.582 20.418 8 16 8ZM16 22C12.686 22 10 19.314 10 16C10 12.686 12.686 10 16 10C19.314 10 22 12.686 22 16C22 19.314 19.314 22 16 22Z" fill="var(--gold-primary)"/>
          <path d="M16 12C13.791 12 12 13.791 12 16C12 18.209 13.791 20 16 20C18.209 20 20 18.209 20 16C20 13.791 18.209 12 16 12Z" fill="var(--gold-primary)"/>
        </svg>
        <div className="logo-text">
          <h1>Q-FY</h1>
          <span>QID INTELLIGENCE SYSTEM</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div 
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="status-widget">
          <div className="status-label">System Status</div>
          <div className="status-indicator">
            <div className="dot"></div>
            <span>Online</span>
          </div>
          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>All systems operational</p>
        </div>

        <div className="user-widget">
          <div className="user-avatar">
            <UserIcon size={20} color="var(--text-secondary)" />
          </div>
          <div className="user-info">
            <span className="name">Admin</span>
            <span className="role">Super Administrator</span>
          </div>
          <ChevronDown size={16} color="var(--text-muted)" />
        </div>
      </div>
    </aside>
  );
};
