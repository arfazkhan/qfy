import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Shield } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const login = useAuthStore(state => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password, rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="soft-luxury-page">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="luxury-card login-box"
      >
        <div className="login-header">
          <div className="brand-icon">
            <Shield size={32} color="#d4af37" fill="rgba(212, 175, 55, 0.1)" />
          </div>
          <h1>Q-fy</h1>
          <p>Scan and Verify</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-pill">{error}</div>}
          
          <div className="form-group">
            <label className="label-luxury">Username</label>
            <input 
              className="input-luxury"
              type="text" 
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="label-luxury">Password</label>
            <input 
              className="input-luxury"
              type="password" 
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="remember-row">
            <label className="checkbox-wrap">
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="custom-check"></span>
              Keep me logged in
            </label>
          </div>

          <button 
            type="submit" 
            className="btn-luxury full-width"
            disabled={loading}
          >
            {loading ? 'Logging in...' : (
              <>
                <span>Login</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>
      </motion.div>

      <style>{`
        .soft-luxury-page {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050505;
        }
        .login-box {
          width: 100%;
          max-width: 420px;
          padding: 48px;
        }
        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }
        .login-header h1 {
          font-size: 2.5rem;
          color: white;
          margin: 12px 0 4px;
          letter-spacing: -1px;
        }
        .login-header p {
          color: var(--text-secondary);
          font-size: 0.9rem;
        }
        .brand-icon {
          background: rgba(212, 175, 55, 0.05);
          width: 64px;
          height: 64px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          border: 1px solid var(--glass-border);
        }
        .form-group {
          margin-bottom: 24px;
        }
        .remember-row {
          margin-bottom: 32px;
        }
        .checkbox-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.85rem;
          color: var(--text-secondary);
          cursor: pointer;
        }
        .checkbox-wrap input { display: none; }
        .custom-check {
          width: 18px;
          height: 18px;
          border: 1px solid var(--glass-border);
          border-radius: 6px;
          background: rgba(255,255,255,0.02);
        }
        .checkbox-wrap input:checked + .custom-check {
          background: var(--accent-gold);
          border-color: var(--accent-gold);
        }
        .full-width { width: 100%; }
        .error-pill {
          background: rgba(255, 75, 75, 0.1);
          color: var(--danger);
          padding: 12px;
          border-radius: 12px;
          font-size: 0.85rem;
          text-align: center;
          margin-bottom: 24px;
        }
      `}</style>
    </div>
  );
};
