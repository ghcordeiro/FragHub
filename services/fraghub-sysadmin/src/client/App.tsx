import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ServicesPage from './pages/ServicesPage';
import LogsPage from './pages/LogsPage';
import DatabasePage from './pages/DatabasePage';
import UpdatesPage from './pages/UpdatesPage';
import SystemPage from './pages/SystemPage';
import './styles/layout.css';

const NAV_ITEMS = [
  { to: '/services', label: '⚙ Serviços' },
  { to: '/logs', label: '📋 Logs' },
  { to: '/database', label: '🗄 Banco de Dados' },
  { to: '/updates', label: '🎮 Atualizações' },
  { to: '/system', label: '📊 Sistema' },
];

export default function App() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-dot" />
          <span>FragHub</span>
          <span className="brand-sub">SysAdmin</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>LAN only</span>
        </div>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/services" replace />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/database" element={<DatabasePage />} />
          <Route path="/updates" element={<UpdatesPage />} />
          <Route path="/system" element={<SystemPage />} />
        </Routes>
      </main>
    </div>
  );
}
