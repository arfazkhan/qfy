import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scan,
  Users,
  CheckCircle2,
  Clock,
  Building2,
  User as UserIcon,
  Shield,
  Sun,
  AlertOctagon
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { IndividualResultCard, ResultStatus } from '../components/IndividualResultCard';

const StatCard = ({ icon, label, subLabel, value, trend, isPositive, colorClass }: any) => (
  <div className="luxury-card-compact animate-fade-in" style={{
    background: 'rgba(15, 15, 15, 0.6)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    minWidth: '200px'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      <div className={`stat-icon-glow ${colorClass}`} style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.5px', marginBottom: '4px' }}>
          {label}
          {subLabel && <div style={{ fontSize: '0.55rem', opacity: 0.8 }}>{subLabel}</div>}
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>{value}</div>
      </div>
    </div>
    {trend !== '0%' && (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.3)',
        fontWeight: 500,
        marginTop: '12px'
      }}>
        <span style={{ color: isPositive ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
          {isPositive ? '↑' : '↓'} {trend}
        </span>
        <span>from yesterday</span>
      </div>
    )}
  </div>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    total_scans: 0,
    total_scans_trend: 0,
    individual_visits: 0,
    individual_visits_trend: 0,
    business_visits: 0,
    business_visits_trend: 0,
    expiring_soon: 0,
    expiring_soon_trend: 0,
    invalid_ids: 0,
    invalid_ids_trend: 0
  });
  const [qidSearch, setQidSearch] = useState('');
  const [searchType, setSearchType] = useState<'individual' | 'business'>('individual');
  const [lastResult, setLastResult] = useState<any>(null);
  const [isVisitLogged, setIsVisitLogged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qidDigits, setQidDigits] = useState<string[]>(Array(11).fill(''));
  const [crDigits, setCrDigits] = useState<string[]>(Array(8).fill(''));

  const handleScan = () => {
    navigate('/scan');
  };

  const handleLogVisit = async () => {
    if (!lastResult) return;
    try {
      const endpoint = lastResult.type === 'individual' 
        ? `/users/${lastResult.qid}/visit` 
        : `/businesses/${lastResult.id}/visit`;
        
      await ApiClient.post(endpoint, {});
      setIsVisitLogged(true);
      // Refresh stats and user data to show updated counts
      fetchDashboardStats();
      handleSearch();
    } catch (err) {
      console.error("Failed to log visit", err);
      alert('Failed to log visit. Please try again.');
    }
  };

  const handleSearch = async () => {
    setError(null);

    // Get QID/CR from digits state based on search type
    const joinedDigits = searchType === 'individual' ? qidDigits.join('') : crDigits.join('');

    // If digits are empty but qidSearch has value (from manual input or other), use qidSearch
    // Otherwise use joined digits
    let finalSearchValue = joinedDigits.length > 0 ? joinedDigits : qidSearch;

    if (!finalSearchValue) return;

    // Auto-pad CR if business
    if (searchType === 'business' && finalSearchValue.length > 0 && finalSearchValue.length < 8) {
      finalSearchValue = finalSearchValue.padStart(8, '0');
      setCrDigits(finalSearchValue.split(''));
    }

    if (searchType === 'individual') {
      const qidRegex = /^\d{11}$/;
      if (!qidRegex.test(finalSearchValue)) {
        setError("Please enter a valid 11-digit QID number.");
        return;
      }
    } else {
      const crRegex = /^\d{1,12}$/; // Allow entry but we pad to 8
      if (!crRegex.test(finalSearchValue)) {
        setError("Please enter a valid CR number.");
        return;
      }
    }

    setIsVisitLogged(false);
    setQidSearch(finalSearchValue); // Sync for internal use

    if (searchType === 'business') {
      try {
        const response = await ApiClient.request<any>(`/businesses/search/${finalSearchValue}`, { auth: true });
        if (response) {
          setLastResult({
            type: 'business',
            id: response.id,
            status: response.status,
            name: response.name,
            cr_number: response.cr_number,
            cr_expiry: response.cr_expiry ? new Date(response.cr_expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A',
            latest_note: response.latest_note,
            document_summary: response.document_summary,
            owner_name: response.owner_name,
            manager_name: response.manager_name,
            visit_count: response.visit_count,
            last_seen_at: response.last_seen_at ? new Date(response.last_seen_at).toLocaleDateString() : 'Never'
          });
        }
      } catch (err: any) {
        console.error("Business search error:", err);
        if (err.status === 404) {
          setLastResult({
            type: 'business',
            status: 'NOT_FOUND',
            cr_number: finalSearchValue
          });
        } else {
          setLastResult({
            type: 'business',
            status: 'SYSTEM_ERROR',
            errorMessage: 'Business intelligence service unavailable.'
          });
        }
      }
    } else {
      // Individual search
      try {
        const response = await ApiClient.get<any>(`/users/${finalSearchValue}`);
        const user = response.user;

        setLastResult({
          type: 'individual',
          status: response.status as ResultStatus,
          name: user.name,
          qid: user.qid_number,
          expiry: new Date(user.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          daysLeft: response.days_left,
          daysExpired: response.days_expired,
          graceDaysRemaining: response.grace_days_remaining,
          lastSeen: user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString() : 'Never',
          visits: user.visit_count,
          frontImage: user.front_image,
          mobile_number: user.mobile_number,
          errorMessage: response.status_message,
          isExpired: response.is_expired
        });
      } catch (err: any) {
        console.error("Search error:", err);
        if (err.status === 404) {
          setLastResult({
            type: 'individual',
            status: 'NOT_FOUND'
          });
        } else {
          setLastResult({
            type: 'individual',
            status: 'SYSTEM_ERROR',
            errorMessage: 'Unable to connect to the central server.'
          });
        }
      }
    }
  };

  const fetchDashboardStats = async () => {
    try {
      const data = await ApiClient.request<any>('/users/stats/summary', { auth: true });
      setStats({
        total_scans: data?.total_scans ?? 0,
        total_scans_trend: data?.total_scans_trend ?? 0,
        individual_visits: data?.individual_visits ?? 0,
        individual_visits_trend: data?.individual_visits_trend ?? 0,
        business_visits: data?.business_visits ?? 0,
        business_visits_trend: data?.business_visits_trend ?? 0,
        expiring_soon: data?.expiring_soon ?? 0,
        expiring_soon_trend: data?.expiring_soon_trend ?? 0,
        invalid_ids: data?.invalid_ids ?? 0,
        invalid_ids_trend: data?.invalid_ids_trend ?? 0
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const statsTimer = setInterval(fetchDashboardStats, 30000);
    fetchDashboardStats();

    return () => {
      clearInterval(timer);
      clearInterval(statsTimer);
    };
  }, []);

  return (
    <div className="dashboard-grid" style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Section */}
      <header className="dashboard-top-header">
        <div className="time-display">
          <Clock size={20} color="var(--gold-primary)" />
          <div className="time-text">
            <span className="time">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <span className="label">LOCAL TIME</span>
          </div>
        </div>

        <div className="header-controls">
          <div className="date-display">
            <span className="day">{currentTime.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}</span>
            <span className="date">{currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
          </div>
          <div className="control-icons">
            <button className="icon-btn"><Sun size={18} /></button>
            <button className="icon-btn" style={{ background: '#111' }}><UserIcon size={18} /></button>
          </div>
        </div>
      </header>

      {/* Unified Quick Search & Result Section */}
      <section className="quick-search-section">
        <div className="dashboard-split-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '32px' }}>
          {/* Left Side: Inputs */}
          <div className="search-input-area" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="section-header" style={{ marginBottom: '8px' }}>
              <div className="header-text">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>QUICK SEARCH</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
                  Access real-time verification and compliance intelligence
                </p>
              </div>
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
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: searchType === 'individual' ? 'var(--gold-primary)' : 'transparent',
                  color: searchType === 'individual' ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setSearchType('individual');
                  setLastResult(null);
                  setIsVisitLogged(false);
                  setQidSearch('');
                  setQidDigits(Array(11).fill(''));
                  setCrDigits(Array(8).fill(''));
                  setError(null);
                }}
              >
                <UserIcon size={14} />
                INDIVIDUAL
              </button>
              <button
                className={`tab-btn ${searchType === 'business' ? 'active' : ''}`}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: searchType === 'business' ? 'var(--gold-primary)' : 'transparent',
                  color: searchType === 'business' ? '#000' : 'var(--text-muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => {
                  setSearchType('business');
                  setLastResult(null);
                  setIsVisitLogged(false);
                  setQidSearch('');
                  setQidDigits(Array(11).fill(''));
                  setCrDigits(Array(8).fill(''));
                  setError(null);
                }}
              >
                <Building2 size={14} />
                BUSINESS
              </button>
            </div>

            <div className="search-input-modern-v2" style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: '20px',
              padding: '24px 32px 32px',
              position: 'relative'
            }}>
              <label style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 800,
                color: 'var(--gold-primary)',
                letterSpacing: '1.5px',
                marginBottom: '20px',
                textTransform: 'uppercase',
                opacity: 0.8
              }}>
                {searchType === 'individual' ? 'Enter Q-ID Number' : 'Enter CR Number'}
              </label>

              {searchType === 'individual' ? (
                /* Digit Entry Grid for QID */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(11, 1fr)',
                  gap: '6px',
                  marginBottom: '32px'
                }}>
                  {qidDigits.map((digit, i) => (
                    <input
                      key={`individual-${i}`}
                      id={`individual-digit-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      autoFocus={i === 0 && !lastResult}
                      style={{
                        width: '100%',
                        height: '64px',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${digit ? 'var(--gold-primary)' : 'var(--glass-border)'}`,
                        borderRadius: '12px',
                        color: 'var(--gold-primary)',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxShadow: digit ? '0 0 10px rgba(212, 175, 55, 0.1)' : 'none'
                      }}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val) {
                          const newDigits = [...qidDigits];
                          newDigits[i] = val;
                          setQidDigits(newDigits);
                          if (i < 10) {
                            setTimeout(() => document.getElementById(`individual-digit-${i + 1}`)?.focus(), 10);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                          if (!qidDigits[i] && i > 0) {
                            const newDigits = [...qidDigits];
                            newDigits[i - 1] = '';
                            setQidDigits(newDigits);
                            document.getElementById(`individual-digit-${i - 1}`)?.focus();
                          } else {
                            const newDigits = [...qidDigits];
                            newDigits[i] = '';
                            setQidDigits(newDigits);
                          }
                        } else if (e.key === 'Enter') {
                          handleSearch();
                        }
                      }}
                    />
                  ))}
                </div>
              ) : (
                /* Digit Entry Grid for Business CR (8 Digits) */
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: '10px',
                  marginBottom: '32px'
                }}>
                  {crDigits.map((digit, i) => (
                    <input
                      key={`business-${i}`}
                      id={`business-digit-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      autoFocus={i === 0 && !lastResult}
                      style={{
                        width: '100%',
                        height: '64px',
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${digit ? 'var(--gold-primary)' : 'var(--glass-border)'}`,
                        borderRadius: '12px',
                        color: 'var(--gold-primary)',
                        outline: 'none',
                        transition: 'all 0.2s',
                        boxShadow: digit ? '0 0 10px rgba(212, 175, 55, 0.1)' : 'none'
                      }}
                      value={digit}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val) {
                          const newDigits = [...crDigits];
                          newDigits[i] = val;
                          setCrDigits(newDigits);
                          if (i < 7) {
                            setTimeout(() => document.getElementById(`business-digit-${i + 1}`)?.focus(), 10);
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace') {
                          if (!crDigits[i] && i > 0) {
                            const newDigits = [...crDigits];
                            newDigits[i - 1] = '';
                            setCrDigits(newDigits);
                            document.getElementById(`business-digit-${i - 1}`)?.focus();
                          } else {
                            const newDigits = [...crDigits];
                            newDigits[i] = '';
                            setCrDigits(newDigits);
                          }
                        } else if (e.key === 'Enter') {
                          handleSearch();
                        }
                      }}
                    />
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '16px' }}>
                <button
                  className="btn-luxury"
                  style={{ flex: 1, height: '54px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)' }}
                  onClick={() => {
                    if (searchType === 'individual') {
                      setQidDigits(Array(11).fill(''));
                   setCrDigits(Array(8).fill(''));
                      setTimeout(() => document.getElementById('individual-digit-0')?.focus(), 10);
                    } else {
                      setQidSearch('');
                    }
                    setError(null);
                    setLastResult(null);
                    setIsVisitLogged(false);
                  }}
                >
                  CLEAR
                </button>
                <button
                  className="btn-gold"
                  style={{
                    flex: 2,
                    height: '54px',
                    fontSize: '0.85rem',
                    letterSpacing: '1px',
                    opacity: (searchType === 'individual' ? qidDigits.some(d => d !== '') : crDigits.some(d => d !== '')) ? 1 : 0.5
                  }}
                  onClick={handleSearch}
                >
                  SEARCH
                </button>
              </div>
            </div>

            {error && (
              <div className="error-message animate-fade-in" style={{
                color: 'var(--danger)',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0 12px'
              }}>
                <AlertOctagon size={14} />
                {error}
              </div>
            )}

            {/* Search type specific info or secondary actions can go here */}
          </div>

          <div className="search-result-area">
            {lastResult ? (
              <div className="result-container animate-fade-in">
                {/* Header Banner */}
                <div className="success-banner" style={{
                  background: isVisitLogged ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                  borderBottom: '1px solid var(--glass-border)',
                  borderLeft: lastResult.status === 'SYSTEM_ERROR' ? '2px solid var(--danger)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      color: lastResult.status === 'SYSTEM_ERROR' ? 'var(--danger)' :
                        lastResult.status === 'NOT_FOUND' ? 'var(--text-muted)' :
                          'var(--gold-primary)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      letterSpacing: '0.5px'
                    }}>
                      {lastResult.type === 'business' ? 'BUSINESS FOUND' :
                        lastResult.status === 'SYSTEM_ERROR' ? 'SYSTEM ERROR' :
                          lastResult.status === 'NOT_FOUND' ? 'NO MATCH FOUND' :
                            'USER FOUND'}
                    </span>
                    {isVisitLogged && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontSize: '0.75rem', marginLeft: '8px' }}>
                        <CheckCircle2 size={14} /> Visit logged successfully
                      </span>
                    )}
                  </div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}</span>
                </div>

                {/* === BUSINESS RESULT CARD === */}
                {lastResult.type === 'business' ? (
                  lastResult.status === 'NOT_FOUND' ? (
                    <div className="result-card-modern status-muted" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
                      <div style={{ position: 'relative', marginBottom: '24px' }}>
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          borderRadius: '50%', 
                          background: 'rgba(255,255,255,0.03)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          border: '1px solid var(--glass-border)' 
                        }}>
                          <Building2 size={32} color="var(--text-muted)" />
                        </div>
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: -10, 
                          padding: '4px 10px', 
                          background: 'rgba(255,255,255,0.05)', 
                          borderRadius: '6px', 
                          fontSize: '0.6rem', 
                          fontWeight: 800, 
                          color: 'var(--text-muted)', 
                          border: '1px solid var(--glass-border)' 
                        }}>
                          NOT FOUND
                        </div>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Business Intelligence Not Found</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: '1.6', marginBottom: '32px' }}>
                        The CR number <strong>{lastResult.cr_number}</strong> is not currently registered in our compliance network.
                      </p>
                      <button 
                        className="btn-gold" 
                        style={{ padding: '14px 40px', borderRadius: '14px', width: 'auto', minWidth: '220px' }}
                        onClick={() => navigate(`/business/add?cr=${lastResult.cr_number}`)}
                      >
                        REGISTER NEW BUSINESS
                      </button>
                    </div>
                  ) : lastResult.status === 'SYSTEM_ERROR' ? (
                    <div className="result-card-modern status-danger" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
                      <div style={{ position: 'relative', marginBottom: '24px' }}>
                        <div style={{ 
                          width: '80px', 
                          height: '80px', 
                          borderRadius: '50%', 
                          background: 'rgba(239, 68, 68, 0.05)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          border: '1px solid rgba(239, 68, 68, 0.2)' 
                        }}>
                          <AlertOctagon size={32} color="var(--danger)" />
                        </div>
                        <div style={{ 
                          position: 'absolute', 
                          top: 0, 
                          right: -15, 
                          padding: '4px 10px', 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          borderRadius: '6px', 
                          fontSize: '0.6rem', 
                          fontWeight: 800, 
                          color: 'var(--danger)', 
                          border: '1px solid rgba(239, 68, 68, 0.2)' 
                        }}>
                          SYSTEM ERROR
                        </div>
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Intelligent Lookup Failure</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: '1.6', marginBottom: '32px' }}>
                        {lastResult.errorMessage || 'Something went wrong while processing the business search.'}
                      </p>
                      <button 
                        className="btn-luxury" 
                        style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '12px 32px' }}
                        onClick={handleSearch}
                      >
                        RETRY LOOKUP
                      </button>
                    </div>
                  ) : (
                    <div className="result-card-modern business-summary" style={{ padding: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                          <div style={{
                            width: '64px', height: '64px', borderRadius: '16px',
                            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <Building2 size={32} color="#3b82f6" />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{lastResult.name}</h3>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>CR Number: {lastResult.cr_number}</p>
                          </div>
                        </div>
                        <div className={`status-pill ${lastResult.status.toLowerCase().replace('_', '-')}`} style={{
                          padding: '6px 14px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800,
                          background: lastResult.status === 'COMPLIANT' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: lastResult.status === 'COMPLIANT' ? '#10b981' : '#ef4444',
                          border: `1px solid ${lastResult.status === 'COMPLIANT' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                        }}>
                          {lastResult.status.replace('_', ' ')}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px', paddingLeft: '8px' }}>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CR Expiry</p>
                          <h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 800, margin: '8px 0' }}>{lastResult.cr_expiry}</h4>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                            Status: <span style={{ color: lastResult.status === 'COMPLIANT' ? '#10b981' : '#ef4444' }}>{lastResult.status}</span>
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Stakeholders</p>
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>Owner: <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{lastResult.owner_name || 'Not Linked'}</span></div>
                            <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 700 }}>Manager: <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>{lastResult.manager_name || 'Not Linked'}</span></div>
                          </div>
                        </div>
                      </div>

                      <div className="doc-checklist-mini" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                        <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px' }}>COMPLIANCE CHECKLIST</span>
                        {lastResult.document_summary?.map((doc: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{doc.type}</span>
                            {doc.status === 'valid' ? (
                              <CheckCircle2 size={16} color="#10b981" />
                            ) : (
                              <AlertOctagon size={16} color="#ef4444" />
                            )}
                          </div>
                        ))}
                      </div>

                      {lastResult.latest_note && (
                        <div className="latest-note-snippet" style={{
                          background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', marginBottom: '24px',
                          borderLeft: '3px solid var(--gold-primary)'
                        }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', display: 'block', marginBottom: '4px' }}>LATEST NOTE</span>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>"{lastResult.latest_note}"</p>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '12px' }}>
                        {!isVisitLogged ? (
                          <button 
                            className="btn-gold" 
                            style={{ 
                              flex: 2, 
                              height: '48px', 
                              fontSize: '0.8rem', 
                              letterSpacing: '1px', 
                              background: 'linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-secondary) 100%)',
                              color: '#000',
                              border: 'none',
                              borderRadius: '12px'
                            }}
                            onClick={handleLogVisit}
                          >
                            LOG VISIT
                          </button>
                        ) : (
                          <div style={{ flex: 2, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>
                            <CheckCircle2 size={16} color="var(--success)" />
                            LOGGED
                          </div>
                        )}
                        <button
                          className="btn-luxury"
                          onClick={() => navigate(`/business/${lastResult.cr_number}`)}
                          style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '0.8rem' }}
                        >
                          DETAILS
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  /* === INDIVIDUAL RESULT CARD === */
                  <IndividualResultCard
                    result={lastResult}
                    isVisitLogged={isVisitLogged}
                    onLogVisit={handleLogVisit}
                    onRetry={handleSearch}
                    onScan={handleScan}
                    onDetails={() => navigate(`/user/${lastResult.qid}`)}
                  />
                )}
              </div>
            ) : (
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed var(--glass-border)',
                  borderRadius: '24px',
                  color: 'var(--text-muted)',
                  background: 'rgba(255,255,255,0.01)',
                  gap: '16px',
                  padding: '40px'
                }}
              >
                <div style={{ padding: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                  <Scan size={40} opacity={0.3} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-secondary)' }}>System Ready for Lookup</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Enter QID / CR Number</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Overview Stats Section */}
      <section className="overview-stats-section" style={{ marginTop: '16px' }}>
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '2px' }}>OVERVIEW STATS</h2>
        </div>
        <div className="stats-cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '20px'
        }}>
          <StatCard
            icon={<Users size={20} color="#fbbf24" />}
            label="TOTAL VISITS"
            value={stats.total_scans.toLocaleString()}
            trend={`${stats.total_scans_trend > 0 ? '+' : ''}${stats.total_scans_trend}%`}
            isPositive={stats.total_scans_trend >= 0}
            colorClass="glow-amber"
          />
          <StatCard
            icon={<UserIcon size={20} color="#10b981" />}
            label="INDIVIDUAL VISITS"
            value={stats.individual_visits.toLocaleString()}
            trend={`${stats.individual_visits_trend > 0 ? '+' : ''}${stats.individual_visits_trend}%`}
            isPositive={stats.individual_visits_trend >= 0}
            colorClass="glow-green"
          />
          <StatCard
            icon={<Building2 size={20} color="#3b82f6" />}
            label="BUSINESS VISITS"
            value={stats.business_visits.toLocaleString()}
            trend={`${stats.business_visits_trend > 0 ? '+' : ''}${stats.business_visits_trend}%`}
            isPositive={stats.business_visits_trend >= 0}
            colorClass="glow-blue"
          />
          <StatCard
            icon={<Clock size={20} color="#f97316" />}
            label="EXPIRING SOON"
            subLabel="(≤ 30 DAYS)"
            value={stats.expiring_soon.toLocaleString()}
            trend={`${stats.expiring_soon_trend > 0 ? '+' : ''}${stats.expiring_soon_trend}%`}
            isPositive={stats.expiring_soon_trend <= 0} // For expiring, negative trend is often good (fewer expiring)
            colorClass="glow-orange"
          />
          <StatCard
            icon={<Shield size={20} color="#ef4444" />}
            label="INVALID IDS / CR"
            value={stats.invalid_ids.toLocaleString()}
            trend={`${stats.invalid_ids_trend > 0 ? '+' : ''}${stats.invalid_ids_trend}%`}
            isPositive={stats.invalid_ids_trend <= 0} // For invalid, negative trend is good
            colorClass="glow-red"
          />
        </div>
      </section>

      <footer className="dashboard-footer-info" style={{ marginTop: 'auto', paddingBottom: '10px', paddingTop: '24px' }}>
        <div className="footer-left">
          <Shield size={16} color="var(--gold-primary)" />
          <span>Secure. Fast. Intelligent.</span>
        </div>
        <div className="footer-right">
          <span>Q-fy v1.0.0</span>
          <span className="dot-sep">•</span>
          <span>© 2026 Q-fy. All rights reserved.</span>
        </div>
      </footer>

      <style>{`
        .dashboard-grid { padding: 0; }
        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        .dashboard-top-header { display: flex; justify-content: space-between; align-items: center; }
        .time-display { display: flex; align-items: center; gap: 12px; }
        .time-text { display: flex; flex-direction: column; }
        .time-text .time { font-size: 1.6rem; font-weight: 700; line-height: 1; }
        .time-text .label { font-size: 0.6rem; color: var(--text-muted); font-weight: 800; letter-spacing: 1px; }
        
        .header-controls { display: flex; align-items: center; gap: 32px; }
        .date-display { text-align: right; display: flex; flex-direction: column; }
        .date-display .day { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); letter-spacing: 1px; }
        .date-display .date { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
        .control-icons { display: flex; gap: 16px; }
        .icon-btn { background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); transition: 0.2s; }
        .icon-btn:hover { border-color: var(--gold-primary); color: #fff; }

        .search-container { position: relative; padding: 32px 40px; overflow: hidden; }
        .search-hint { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px; font-weight: 600; }
        .search-bar-wrapper { display: flex; gap: 12px; max-width: 650px; position: relative; z-index: 1; }
        .search-input-group { flex: 1; display: flex; align-items: center; gap: 12px; background: #000; border: 1px solid var(--glass-border); padding: 0 20px; border-radius: 8px; }
        .search-input-group input { background: none; border: none; padding: 16px 0; color: #fff; outline: none; width: 100%; font-size: 0.95rem; }
        .search-btn { padding: 0 32px; border-radius: var(--radius-sm); font-size: 0.75rem; letter-spacing: 1px; }
        .search-bg-graphic { position: absolute; right: 40px; top: 50%; transform: translateY(-50%); opacity: 0.2; pointer-events: none; }

        .stats-cards-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }
        
        .stat-card-luxury { padding: 24px; display: flex; flex-direction: column; gap: 16px; min-height: 180px; }
        .stat-card-header { display: flex; align-items: center; justify-content: flex-start; gap: 8px; color: var(--text-muted); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.5px; }
        .stat-card-main { display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 8px 0; }
        .stat-icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: absolute; top: 24px; left: 24px; }
        .stat-value-box { display: flex; flex-direction: column; align-items: center; width: 100%; margin-top: 40px; }
        .stat-value-box .val { font-size: 2.2rem; font-weight: 700; color: #fff; }
        .stat-card-trend { display: flex; align-items: center; justify-content: center; gap: 4px; font-size: 0.7rem; font-weight: 700; }
        .trend-up { color: var(--success); }
        .trend-down { color: var(--danger); }

        .dual-scan-container { display: grid; grid-template-columns: 1.2fr 1px 1fr; padding: 40px; min-height: 320px; }
        .upload-area { display: flex; flex-direction: column; gap: 20px; }
        .upload-box-dashed { flex: 1; border: 2px dashed var(--glass-border-gold); border-radius: var(--radius-md); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; transition: 0.3s; }
        .upload-box-dashed:hover { background: var(--gold-muted); border-color: var(--gold-primary); }
        .btn-outline-gold { background: none; border: 1.5px solid var(--gold-primary); color: var(--gold-primary); padding: 12px 24px; border-radius: 8px; font-size: 0.75rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; letter-spacing: 1px; }
        .btn-outline-gold:hover { background: var(--gold-primary); color: #000; }
        .upload-footer { display: flex; gap: 12px; font-size: 0.7rem; color: var(--text-muted); font-weight: 700; letter-spacing: 0.5px; }
        
        .vertical-divider { position: relative; height: 100%; width: 1px; background: var(--glass-border); display: flex; align-items: center; justify-content: center; }
        .or-circle { width: 40px; height: 40px; background: var(--bg-color); border: 1px solid var(--gold-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 800; color: var(--gold-primary); position: absolute; z-index: 1; }

        .scanner-module { padding-left: 40px; display: flex; flex-direction: column; gap: 32px; justify-content: center; }
        .usb-status { display: flex; align-items: center; gap: 20px; }
        .usb-icon-circle { border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--glass-border); }
        .usb-text h4 { font-size: 1rem; letter-spacing: 1px; font-weight: 800; }
        .usb-text p { font-size: 0.8rem; color: var(--text-muted); line-height: 1.4; }
        
        .connection-pill { border-radius: 12px; border: 1px solid var(--glass-border); }
        .dot { background: var(--success); border-radius: 50%; box-shadow: 0 0 10px var(--success); }
        
        .full-width-btn { width: 100%; height: 56px; border-radius: 12px; font-size: 0.85rem; letter-spacing: 2px; font-weight: 800; }

        .dashboard-footer-info { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--glass-border); }
        .footer-left { display: flex; align-items: center; gap: 12px; font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
        .footer-right { display: flex; align-items: center; gap: 12px; font-size: 0.8rem; color: var(--text-muted); font-weight: 600; }
      `}</style>
    </div>
  );
};
