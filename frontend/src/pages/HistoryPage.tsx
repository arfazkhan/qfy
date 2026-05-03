import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCcw,
  UserCheck,
  Shield,
  Search as SearchIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiClient } from '../api/client';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchRecent();
  }, []);

  const fetchRecent = async () => {
    try {
      const data = await ApiClient.request<any[]>('/users/', { auth: true });
      setResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    setLoading(true);
    try {
      const response = await ApiClient.request<any>(`/users/${searchQuery}`, { auth: true });
      setResults([response.user]);
    } catch (err) {
      setResults([]);
      setToast("No records found for this QID");
    } finally {
      setLoading(false);
    }
  };

  const markVisit = async (qid: string) => {
    try {
      await ApiClient.request(`/users/${qid}/visit`, { method: 'POST', auth: true });
      setToast("Visit logged successfully");
      fetchRecent();
    } catch (err) {
      setToast("Failed to log visit");
    }
  };

  return (
    <div className="dashboard-grid">
      <div className="section-header">
        <h2>Customer Archives</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{results.length} ENTRIES FOUND</div>
      </div>

      <section className="search-section">
        <div className="luxury-card search-container" style={{ padding: '24px 40px' }}>
          <form onSubmit={handleSearch} className="search-bar-wrapper">
            <div className="search-input-group">
              <SearchIcon size={20} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search QID or Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button type="submit" className="btn-luxury search-btn">FIND</button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); fetchRecent(); }}
                className="btn-secondary"
                style={{ borderRadius: 'var(--radius-sm)' }}
              >
                CLEAR
              </button>
            )}
          </form>
        </div>
      </section>

      <div className="results-list">
        <AnimatePresence>
          {results.map((user, index) => (
            <motion.div
              key={user.qid_number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="luxury-card customer-row"
            >
              <div className="customer-main">
                <div className="customer-avatar-box" style={{ overflow: 'hidden' }}>
                  {user.front_image ? (
                    <img 
                      src={ApiClient.resolveStaticUrl(user.front_image)} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      alt="" 
                    />
                  ) : (
                    <User size={20} color="var(--gold-primary)" />
                  )}
                </div>
                <div className="customer-info">
                  <span className="customer-name">{user.name}</span>
                  <span className="customer-qid">{user.qid_number}</span>
                </div>
              </div>

              <div className="customer-status">
                <StatusBadge expiryDate={user.expiry_date} />
              </div>

              <div className="customer-meta">
                <div className="meta-item">
                  <RefreshCcw size={12} color="var(--gold-secondary)" />
                  <span>{user.visit_count} VISITS</span>
                </div>
                <div className="meta-item">
                  <Clock size={12} color="var(--gold-secondary)" />
                  <span>LAST: {new Date(user.last_seen_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="customer-actions">
                <button onClick={() => markVisit(user.qid_number)} className="btn-secondary small">
                  <UserCheck size={14} />
                  LOG VISIT
                </button>

                {isExpired(user.expiry_date) && (
                  <button onClick={() => navigate('/dashboard')} className="btn-luxury small">
                    <RefreshCcw size={14} />
                    RESCAN
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && results.length === 0 && (
          <div className="empty-results luxury-card">
            <Shield size={48} color="var(--gold-muted)" strokeWidth={0.5} />
            <p>No matches found in the system archives.</p>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style>{`
        .results-list { display: flex; flex-direction: column; gap: 12px; }
        .customer-row { 
          padding: 20px 32px; display: grid; grid-template-columns: 1.5fr 1fr 1fr 1.2fr; align-items: center; gap: 24px;
          border: 1px solid var(--glass-border); transition: 0.3s;
        }
        .customer-row:hover { border-color: var(--gold-primary); background: var(--gold-muted); }
        
        .customer-main { display: flex; align-items: center; gap: 16px; }
        .customer-avatar-box { width: 44px; height: 44px; background: rgba(255,255,255,0.03); border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--glass-border); }
        .customer-info { display: flex; flex-direction: column; }
        .customer-name { font-weight: 700; font-size: 1rem; color: #fff; }
        .customer-qid { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); letter-spacing: 1px; }

        .customer-meta { display: flex; flex-direction: column; gap: 6px; }
        .meta-item { display: flex; align-items: center; gap: 8px; font-size: 0.65rem; color: var(--text-secondary); font-weight: 800; letter-spacing: 0.5px; }

        .customer-actions { display: flex; align-items: center; gap: 12px; justify-content: flex-end; }
        .btn-secondary.small { padding: 8px 16px; font-size: 0.7rem; letter-spacing: 1px; }
        .btn-luxury.small { padding: 8px 16px; font-size: 0.7rem; letter-spacing: 1px; }

        .status-badge { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 6px; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; width: fit-content; letter-spacing: 1px; }
        .status-valid { background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); }
        .status-expired { background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); }

        .empty-results { padding: 80px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 24px; border: 1px dashed var(--glass-border); }
        .empty-results p { color: var(--text-muted); font-weight: 600; }
      `}</style>
    </div>
  );
};

const isExpired = (dateStr: string) => {
  const expiry = new Date(dateStr);
  return expiry < new Date();
};

const StatusBadge = ({ expiryDate }: any) => {
  const expired = isExpired(expiryDate);
  return (
    <div className={`status-badge ${expired ? 'status-expired' : 'status-valid'}`}>
      {expired ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
      <span>{expired ? 'Expired' : 'Valid'}</span>
    </div>
  );
};
