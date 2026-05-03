import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ScanPage } from './pages/ScanPage';
import { LookupPage } from './pages/LookupPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { useAuthStore } from './store/authStore';
import { MainLayout } from './components/MainLayout';
import './styles/main.css';

function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const refreshSession = useAuthStore(state => state.refreshSession);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />}
        />
        <Route
          path="/dashboard"
          element={isAuthenticated ? <MainLayout><DashboardPage /></MainLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/history"
          element={isAuthenticated ? <MainLayout><HistoryPage /></MainLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/scan"
          element={isAuthenticated ? <MainLayout><ScanPage /></MainLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/lookup"
          element={isAuthenticated ? <MainLayout><LookupPage /></MainLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/user/:id"
          element={isAuthenticated ? <MainLayout><UserDetailPage /></MainLayout> : <Navigate to="/login" />}
        />
        <Route
          path="/"
          element={<Navigate to="/dashboard" />}
        />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
