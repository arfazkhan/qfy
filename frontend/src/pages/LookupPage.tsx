import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronRight,
  Hash,
  Globe,
  Building2,
  User as UserIcon,
  Clock,
  Shield
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { useNavigate, useSearchParams } from 'react-router-dom';

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
}

interface BusinessResult {
  id: string;
  cr_number: string;
  name: string;
  status: string;
  cr_expiry_date: string;
  nationality: string;
}

export const LookupPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const crParam = searchParams.get('cr');

  const [searchType, setSearchType] = useState<'individual' | 'business'>(
    viewParam === 'people' ? 'individual' : 'individual'
  );
  const [results, setResults] = useState<UserResult[]>([]);
  const [businessResults, setBusinessResults] = useState<BusinessResult[]>([]);
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
      
      if (searchType === 'individual') {
        if (nationality) params.nationality = nationality;
        if (status) params.status = status;
        if (isManual !== null) params.is_manual_edit = isManual;
        if (crParam) params.cr_number = crParam;
        const data = await ApiClient.get<UserResult[]>('/lookup/users', params);
        setResults(data);
      } else if (searchType === 'business') {
        if (status) params.status = status;
        if (crParam) params.cr_number = crParam;
        const data = await ApiClient.get<BusinessResult[]>('/lookup/businesses', params);
        setBusinessResults(data);
      }
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
  }, [query, nationality, status, isManual, searchType, crParam]);

  const getStatusBadgeClass = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return 'status-badge-invalid';
    if (days <= 30) return 'status-badge-expiring_soon';
    return 'status-badge-active';
  };

  const getDateColor = (expiryStr: string) => {
    if (!expiryStr) return 'var(--text-muted)';
    const expiry = new Date(expiryStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = expiry.getTime() - today.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return '#ef4444'; // Red for expired
    if (days <= 30) return '#fbbf24'; // Gold for expiring soon
    return '#10b981'; // Green for active
  };

  const getBusinessStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return '#10b981';
      case 'PARTIAL': return '#fbbf24';
      case 'NON_COMPLIANT': return '#ef4444';
      case 'INVALID': return '#7f1d1d';
      default: return 'var(--text-muted)';
    }
  };

  const isEmbedded = searchParams.get('embedded') === 'true';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header */}
      {!isEmbedded && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>LOOKUP</h1>
              <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>Advanced data filtering and record management</p>
            </div>
            
            <div className="search-tabs-container" style={{
              display: 'flex',
              gap: '2px',
              background: 'rgba(255,255,255,0.03)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--glass-border)',
              width: 'fit-content'
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
                <UserIcon size={14} />
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
          <button
            className={`btn-luxury ${isFilterVisible ? 'active' : ''}`}
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            style={{ background: isFilterVisible ? 'var(--gold-muted)' : 'rgba(255,255,255,0.02)', padding: '12px 24px' }}
          >
            <Filter size={18} />
            {isFilterVisible ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', flex: 1, overflow: 'hidden' }}>
        {/* Filter Sidebar */}
        {isFilterVisible && (
          <div className="luxury-card animate-slide-in" style={{ width: '320px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: 'fit-content' }}>
            <div className="search-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>GLOBAL SEARCH</label>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  placeholder={searchType === 'individual' ? "Name, QID or Mobile..." : "Name or CR Number..."}
                  className="input-luxury"
                  style={{ width: '100%', paddingLeft: '44px' }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {searchType === 'individual' && (
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
            )}

            <div className="filter-group">
              <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>STATUS</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {searchType === 'individual' ? (
                  [
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
                  ))
                ) : (
                  [
                    { id: 'COMPLIANT', label: 'Compliant' },
                    { id: 'PARTIAL', label: 'Partial' },
                    { id: 'NON_COMPLIANT', label: 'Non-Compliant' },
                    { id: 'INVALID', label: 'Invalid' }
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
                  ))
                )}
              </div>
            </div>

            {searchType === 'individual' && (
              <div className="filter-group">
                <label style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '8px', display: 'block' }}>AUDIT STATUS</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className={`btn-luxury ${isManual === true ? 'active' : ''}`}
                    style={{ flex: 1, padding: '8px', fontSize: '0.65rem', background: isManual === true ? 'var(--gold-muted)' : 'rgba(255,255,255,0.02)' }}
                    onClick={() => setIsManual(isManual === true ? null : true)}
                  >
                    Audited
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
            )}

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
          ) : (searchType === 'individual' ? results.length > 0 : businessResults.length > 0) ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
              {searchType === 'individual' ? results.map((user) => (
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
                      {(() => {
                        const initials = user.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
                        return (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                            color: 'var(--gold-primary)',
                            fontSize: '1.4rem',
                            fontWeight: 900,
                            letterSpacing: '1px',
                            border: '1px solid var(--glass-border)'
                          }}>
                            {initials}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className={getStatusBadgeClass(user.expiry_date)}>
                          {new Date(user.expiry_date) < new Date() ? 'EXPIRED' : 'ACTIVE'}
                        </span>
                        {user.is_manual_edit && (
                          <span className="badge-active-modern" style={{ fontSize: '0.6rem', color: 'var(--gold-primary)' }}>
                            AUDITED
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{user.qid_number}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>MOBILE</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--gold-primary)', fontWeight: 700, fontSize: '0.7rem' }}>
                        <Hash size={10} />
                        {user.mobile_number || 'N/A'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>NATIONALITY</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontWeight: 600, fontSize: '0.7rem' }}>
                        <Globe size={10} />
                        {user.nationality}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>QID EXPIRY</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: getDateColor(user.expiry_date), fontWeight: 700, fontSize: '0.7rem' }}>
                        <Clock size={10} />
                        {user.expiry_date ? new Date(user.expiry_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn-icon-luxury"
                      onClick={() => navigate(`/user/${user.qid_number}`)}
                      style={{ background: 'var(--gold-muted)', border: 'none', color: 'var(--gold-primary)', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )) : businessResults.map((biz) => (
                <div key={biz.id} className="luxury-card animate-scale-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(59, 130, 246, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Building2 size={32} color="#3b82f6" />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ 
                          fontSize: '0.6rem', 
                          fontWeight: 800, 
                          color: getBusinessStatusColor(biz.status), 
                          border: `1px solid ${getBusinessStatusColor(biz.status)}40`,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: `${getBusinessStatusColor(biz.status)}10`
                        }}>
                          {biz.status}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{biz.name}</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>CR: {biz.cr_number}</p>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>NATIONALITY</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fff', fontWeight: 600, fontSize: '0.75rem' }}>
                        <Globe size={12} />
                        {biz.nationality}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>CR EXPIRY</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: getDateColor(biz.cr_expiry_date), fontWeight: 700, fontSize: '0.75rem' }}>
                        <Clock size={12} />
                        {new Date(biz.cr_expiry_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn-icon-luxury"
                      onClick={() => navigate(`/business/${biz.cr_number}`)}
                      style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
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
                {searchType === 'individual' ? <UserIcon size={32} color="var(--text-muted)" /> : <Building2 size={32} color="var(--text-muted)" />}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>No {searchType === 'individual' ? 'Customers' : 'Businesses'} Found</h2>
              <p style={{ color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto' }}>Adjust your filters or try a different search term to find what you're looking for.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
