import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  User as UserIcon, 
  ChevronRight,
  Hash,
  Globe
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';

interface UserResult {
  id: string;
  qid_number: string;
  name: string;
  nationality: string;
  employer: string;
  expiry_date: string;
  mobile_number: string;
  front_image: string;
  is_manual_edit: boolean;
  status?: string;
  status_message?: string;
}

export const LookupPage: React.FC = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [query, setQuery] = useState('');
  const [nationality, setNationality] = useState('');
  const [status, setStatus] = useState('');
  const [isManual, setIsManual] = useState<boolean | null>(null);
  const [isFilterVisible, setIsFilterVisible] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (query) params.q = query;
      if (nationality) params.nationality = nationality;
      if (status) params.status = status;
      if (isManual !== null) params.is_manual_edit = isManual;

      const data = await ApiClient.get<UserResult[]>('/lookup/users', params);
      setResults(data);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchResults();
    }, 300);
    return () => clearTimeout(debounce);
  }, [query, nationality, status, isManual]);

  const getStatusBadgeClass = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = expiry.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'status-badge-invalid';
    if (days <= 30) return 'status-badge-expiring_soon';
    return 'status-badge-active';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>LOOKUP</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>Advanced customer search and data filtering</p>
        </div>
        <button 
          className={`btn-luxury ${isFilterVisible ? 'active' : ''}`}
          onClick={() => setIsFilterVisible(!isFilterVisible)}
          style={{ background: isFilterVisible ? 'var(--gold-muted)' : 'rgba(255,255,255,0.02)', padding: '12px 24px' }}
        >
          <Filter size={18} />
          {isFilterVisible ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        {/* Filter Sidebar */}
        {isFilterVisible && (
          <div className="luxury-card animate-slide-in" style={{ width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: 'fit-content' }}>
            <div className="search-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>GLOBAL SEARCH</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  placeholder="Name, QID or Mobile..."
                  className="input-luxury"
                  style={{ width: '100%', paddingLeft: '44px' }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>NATIONALITY</label>
              <select className="input-luxury" style={{ width: '100%' }} value={nationality} onChange={(e) => setNationality(e.target.value)}>
                <option value="">All Nationalities</option>
                <option value="QATAR">Qatar</option>
                <option value="INDIA">India</option>
                <option value="PAKISTAN">Pakistan</option>
                <option value="NEPAL">Nepal</option>
                <option value="PHILIPPINES">Philippines</option>
              </select>
            </div>

            <div className="filter-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>STATUS</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'ACTIVE', label: 'Active' },
                  { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
                  { id: 'GRACE_PERIOD', label: 'Grace Period' },
                  { id: 'INVALID', label: 'Inactive' }
                ].map(s => (
                  <button 
                    key={s.id}
                    className={`btn-luxury ${status === s.id ? 'active' : ''}`}
                    style={{ 
                      padding: '8px', 
                      fontSize: '0.65rem', 
                      background: status === s.id ? 'var(--gold-muted)' : 'rgba(255,255,255,0.02)',
                      border: status === s.id ? '1px solid var(--gold-primary)' : '1px solid transparent'
                    }}
                    onClick={() => setStatus(status === s.id ? '' : s.id)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>


            <div className="filter-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>AUDIT STATUS</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className={`btn-luxury ${isManual === true ? 'active' : ''}`}
                  style={{ flex: 1, padding: '8px', fontSize: '0.65rem', background: isManual === true ? 'var(--gold-muted)' : 'rgba(255,255,255,0.02)' }}
                  onClick={() => setIsManual(isManual === true ? null : true)}
                >
                  Manually Edited
                </button>
                <button 
                  className={`btn-luxury ${isManual === false ? 'active' : ''}`}
                  style={{ flex: 1, padding: '8px', fontSize: '0.65rem', background: isManual === false ? 'var(--gold-muted)' : 'rgba(255,255,255,0.02)' }}
                  onClick={() => setIsManual(isManual === false ? null : false)}
                >
                  Clean Scan
                </button>
              </div>
            </div>

            <button 
              className="btn-luxury" 
              style={{ width: '100%', marginTop: '8px', background: 'rgba(239, 68, 68, 0.05)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.1)' }}
              onClick={() => {
                setQuery('');
                setNationality('');
                setStatus('');
                setIsManual(null);
              }}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Results Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '12px' }} className="custom-scrollbar">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
              <div className="spinner-gold" />
            </div>
          ) : results.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {results.map((user) => (
                <div key={user.id} className="luxury-card animate-scale-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '12px', 
                      overflow: 'hidden', 
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(255,255,255,0.02)',
                      flexShrink: 0
                    }}>
                      {user.front_image ? (
                        <img src={ApiClient.resolveStaticUrl(user.front_image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                          <UserIcon size={24} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className={getStatusBadgeClass(user.expiry_date)}>
                          {new Date(user.expiry_date) < new Date() ? 'EXPIRED' : 'ACTIVE'}
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {user.is_manual_edit && (
                            <span className="badge-active-modern" style={{ fontSize: '0.6rem', color: 'var(--gold-primary)' }}>
                              AUDITED
                            </span>
                          )}
                        </div>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.qid_number}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>MOBILE</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--gold-primary)', fontWeight: 700, fontSize: '0.75rem' }}>
                        <Hash size={12} />
                        {user.mobile_number || 'N/A'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>NATIONALITY</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>
                        <Globe size={12} />
                        {user.nationality}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    </div>
                    <button 
                      className="btn-icon-luxury" 
                      onClick={() => navigate(`/user/${user.qid_number}`)}
                      style={{ background: 'var(--gold-muted)', border: 'none', color: 'var(--gold-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="luxury-card" style={{ padding: '60px', textAlign: 'center' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                <Search size={32} color="var(--text-muted)" />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>No Customers Found</h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>Adjust your filters or try a different search term to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
