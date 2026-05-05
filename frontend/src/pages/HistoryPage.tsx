import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock,
  CheckCircle,
  AlertTriangle,
  Shield,
  Search as SearchIcon,
  ExternalLink,
  Calendar,
  RefreshCcw,
  Building2,
  Globe
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiClient } from '../api/client';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<'individual' | 'business'>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [businessResults, setBusinessResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // New Filter States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [searchParams] = useSearchParams();
  const qidParam = searchParams.get('qid');
  const crParam = searchParams.get('cr');

  useEffect(() => {
    if (qidParam) {
      setSearchType('individual');
      setSearchQuery(qidParam);
      performSearch(qidParam);
    } else if (crParam) {
      setSearchType('business');
      setSearchQuery(crParam);
      performSearch(crParam);
    } else {
      performSearch();
    }
  }, [qidParam, crParam]); 

  const performSearch = async (query?: string, start?: string, end?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (query || searchQuery) params.q = query || searchQuery;
      if (start || startDate) params.start_date = start || startDate;
      if (end || endDate) params.end_date = end || endDate;

      if (searchType === 'individual') {
        const data = await ApiClient.get<any[]>('/lookup/users', params);
        setResults(data);
      } else {
        const data = await ApiClient.get<any[]>('/lookup/businesses', params);
        setBusinessResults(data);
      }
    } catch (err) {
      if (searchType === 'individual') setResults([]);
      else setBusinessResults([]);
      setToast("Search failed or no records found");
    } finally {
      setLoading(false);
    }
  };

  const fetchRecent = () => performSearch();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };


  const isEmbedded = searchParams.get('embedded') === 'true';

  return (
    <div className="dashboard-grid">
      {!isEmbedded && (
        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Archives & Interactions</h2>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '4px' }}>
              {searchType === 'individual' ? results.length : businessResults.length} ENTRIES FOUND
            </div>
          </div>

          <div className="search-tabs-container" style={{
            display: 'flex',
            gap: '2px',
            background: 'rgba(255,255,255,0.03)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--glass-border)',
          }}>
            <button
              className={`tab-btn ${searchType === 'individual' ? 'active' : ''}`}
              onClick={() => setSearchType('individual')}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: searchType === 'individual' ? 'var(--gold-primary)' : 'transparent',
                color: searchType === 'individual' ? '#000' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <Globe size={14} />
              INDIVIDUAL
            </button>
            <button
              className={`tab-btn ${searchType === 'business' ? 'active' : ''}`}
              onClick={() => setSearchType('business')}
              style={{
                padding: '8px 20px',
                borderRadius: '8px',
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: searchType === 'business' ? 'var(--gold-primary)' : 'transparent',
                color: searchType === 'business' ? '#000' : 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <Building2 size={14} />
              BUSINESS
            </button>
          </div>
        </div>
      )}

      <section className="search-section">
        <div className="luxury-card search-container" style={{ padding: '24px 32px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="search-input-group" style={{ flex: 2 }}>
              <SearchIcon size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder={searchType === 'individual' ? "Search QID or Name..." : "Search CR or Name..."}
                value={searchQuery}
                style={{ background: 'none', border: 'none', color: '#fff', width: '100%', outline: 'none', padding: '8px' }}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: 3 }}>
              <div className="search-input-group" style={{ flex: 1, position: 'relative' }}>
                <Calendar size={16} color="var(--gold-secondary)" />
                <input
                  type="date"
                  className="date-input-luxury"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none', width: '100%' }}
                />
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800 }}>TO</span>
              <div className="search-input-group" style={{ flex: 1, position: 'relative' }}>
                <Calendar size={16} color="var(--gold-secondary)" />
                <input
                  type="date"
                  className="date-input-luxury"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.75rem', outline: 'none', width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="btn-gold" style={{ padding: '10px 24px', fontSize: '0.75rem', color: '#000' }}>SEARCH</button>
              {(searchQuery || startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setStartDate('');
                    setEndDate('');
                    fetchRecent();
                  }}
                  className="btn-secondary"
                  style={{ padding: '10px 16px', fontSize: '0.75rem' }}
                >
                  RESET
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <div className="results-list">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
            <RefreshCcw size={48} className="animate-spin" color="var(--gold-muted)" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {searchType === 'individual' ? (
              results.map((user, index) => (
                <motion.div
                  key={user.qid_number}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                  className="luxury-card customer-row"
                >
                  <div className="customer-main">
                    <div className="customer-avatar-box">
                      {(() => {
                        const initials = user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                        return <div className="luxury-initials">{initials}</div>;
                      })()}
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
                    <button
                      onClick={() => navigate(`/user/${user.qid_number}`)}
                      className="btn-luxury small"
                      style={{ width: '120px', justifyContent: 'center', gap: '8px' }}
                    >
                      <ExternalLink size={14} />
                      DETAILS
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              businessResults.map((biz, index) => (
                <motion.div
                  key={biz.cr_number}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.03 }}
                  className="luxury-card customer-row"
                  style={{ gridTemplateColumns: '1.5fr 1fr 1fr 1.2fr' }}
                >
                  <div className="customer-main">
                    <div className="customer-avatar-box" style={{ background: 'rgba(59, 130, 246, 0.05)', color: '#3b82f6' }}>
                      <Building2 size={20} />
                    </div>
                    <div className="customer-info">
                      <span className="customer-name">{biz.name}</span>
                      <span className="customer-qid">CR: {biz.cr_number}</span>
                    </div>
                  </div>

                  <div className="customer-status">
                    <div className={`status-badge`} style={{ 
                      background: biz.status === 'COMPLIANT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: biz.status === 'COMPLIANT' ? 'var(--success)' : 'var(--danger)',
                      border: `1px solid ${biz.status === 'COMPLIANT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                      <Shield size={12} />
                      <span>{biz.status.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="customer-meta">
                    <div className="meta-item">
                      <Globe size={12} color="var(--gold-secondary)" />
                      <span>{biz.nationality}</span>
                    </div>
                    <div className="meta-item">
                      <Clock size={12} color="var(--gold-secondary)" />
                      <span>UPDATED: {new Date(biz.last_updated).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="customer-actions">
                    <button
                      onClick={() => navigate(`/business/${biz.cr_number}`)}
                      className="btn-luxury small"
                      style={{ width: '120px', justifyContent: 'center', gap: '8px' }}
                    >
                      <ExternalLink size={14} />
                      VIEW
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        )}

        {!loading && (searchType === 'individual' ? results.length === 0 : businessResults.length === 0) && (
          <div className="empty-results luxury-card">
            <Shield size={48} color="var(--gold-muted)" strokeWidth={0.5} />
            <p>No matches found in the {searchType} archives.</p>
          </div>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      <style>{`
        .luxury-initials {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justifyContent: center;
          background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
          color: var(--gold-primary);
          font-size: 1rem;
          font-weight: 900;
          letter-spacing: 1px;
        }
        .search-input-group:focus-within {
          border-color: var(--gold-primary);
          background: rgba(197, 160, 89, 0.05);
        }

        .date-input-luxury::-webkit-calendar-picker-indicator {
          filter: invert(1) sepia(100%) saturate(500%) hue-rotate(10deg);
          cursor: pointer;
        }

        .date-input-luxury {
          width: 100%;
          color-scheme: dark;
        }
        .date-input-luxury::-webkit-calendar-picker-indicator {
          background: transparent;
          bottom: 0;
          color: transparent;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
        }

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
