import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { ScanPage } from './pages/ScanPage';
import { LookupPage } from './pages/LookupPage';
import { UserDetailPage } from './pages/UserDetailPage';
import { BusinessDetailPage } from './pages/BusinessDetailPage';
import { BusinessFormPage } from './pages/BusinessFormPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuthStore } from './store/authStore';
import { MainLayout } from './components/MainLayout';
import './styles/main.css';

// Main Application Component
function App() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const refreshSession = useAuthStore(state => state.refreshSession);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} />
        
        <Route element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/scan" element={<ScanPage />} />
          <Route path="/lookup" element={<LookupPage />} />
          <Route path="/user/:id" element={<UserDetailPage />} />
          
          {/* Business Compliance Routes */}
          <Route path="/business/:id" element={<BusinessDetailPage />} />
          <Route path="/business/add" element={<BusinessFormPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Route>
        
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
