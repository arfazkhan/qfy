import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Scan, 
  Users, 
  UserPlus, 
  Clock, 
  AlertOctagon,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  Usb,
  Sun,
  User as UserIcon,
  ChevronDown,
  ExternalLink,
  CheckCircle2,
  FileText,
  Landmark,
  UserCheck,
  Info,
  AlertTriangle,
  Shield,
  Building2
} from 'lucide-react';
import { ApiClient } from '../api/client';
import { IndividualResultCard, IndividualResult, ResultStatus } from '../components/IndividualResultCard';

const StatCard = ({ icon, label, subLabel, value, trend, isPositive, colorClass }: any) => (
  <div className="luxury-card stat-card-luxury" style={{ position: 'relative' }}>
    <div className={`stat-icon-box ${colorClass}`}>{icon}</div>
    <div className="stat-card-header" style={{ marginLeft: '56px' }}>
      <span>{label}</span>
    </div>
    <div className="stat-value-box">
      <span className="val">{value}</span>
      {subLabel && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: 700 }}>{subLabel}</span>}
    </div>
    <div className={`stat-card-trend ${isPositive ? 'trend-up' : 'trend-down'}`}>
      {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
      <span>{trend} from yesterday</span>
    </div>
  </div>
);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState({
    total_scans: 0,
    existing_users: 0,
    new_users: 0,
    expiring_soon: 0,
    invalid_ids: 0
  });
  const [qidSearch, setQidSearch] = useState('');
  const [searchType, setSearchType] = useState<'individual' | 'business'>('individual');
  const [lastResult, setLastResult] = useState<any>(null);
  const [isVisitLogged, setIsVisitLogged] = useState(false);

  const handleScan = () => {
    navigate('/scan');
  };

  const handleLogVisit = async () => {
    if (!lastResult || !lastResult.qid) return;
    try {
      await ApiClient.post(`/users/${lastResult.qid}/visit`, {});
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
    if (!qidSearch) return;
    
    setIsVisitLogged(false);
    
    if (searchType === 'individual') {
      try {
        const response = await ApiClient.get<any>(`/users/${qidSearch}`);
        const user = response.user;
        
        // Calculate days left/expired
        const expiryDate = new Date(user.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        setLastResult({
          type: 'individual',
          status: response.status as ResultStatus,
          name: user.name,
          qid: user.qid_number,
          expiry: new Date(user.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
          daysLeft: diffDays > 0 ? diffDays : 0,
          daysExpired: diffDays < 0 ? Math.abs(diffDays) : 0,
          graceDaysRemaining: response.status === 'GRACE_PERIOD' ? (30 + diffDays) : 0,
          lastSeen: user.last_seen_at ? new Date(user.last_seen_at).toLocaleDateString() : 'Never',
          visits: user.visit_count,
          frontImage: user.front_image,
          errorMessage: response.status_message
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
    } else {
      // Business search... 
      setLastResult({
        type: 'business',
        status: 'NOT_FOUND',
        name: 'NOT IMPLEMENTED',
        qid: qidSearch
      });
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchDashboardStats();
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const data = await ApiClient.request<any>('/users/stats/summary', { auth: true });
      setStats({
        total_scans: data?.total_scans ?? 0,
        existing_users: data?.existing_users ?? 0,
        new_users: data?.new_users ?? 0,
        expiring_soon: data?.expiring_soon ?? 0,
        invalid_ids: data?.invalid_ids ?? 0
      });
    } catch (err) {
      console.error("Failed to fetch dashboard stats", err);
    }
  };

  return (
    <div className="dashboard-grid">
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
        <div className="dashboard-split-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
          {/* Left Side: Inputs */}
          <div className="search-input-area" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div className="header-text">
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>QUICK SEARCH</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 500 }}>
                  Search and log visits for Individuals or Businesses
                </p>
              </div>
              
              <div className="toggle-group" style={{ height: '54px', padding: '6px', minWidth: '320px' }}>
                <button 
                  className={`toggle-btn ${searchType === 'individual' ? 'active' : ''}`}
                  style={{ flex: 1, height: '100%', fontSize: '0.8rem', letterSpacing: '1px' }}
                  onClick={() => {
                    setSearchType('individual');
                    setLastResult(null);
                    setIsVisitLogged(false);
                    setQidSearch('');
                  }}
                >
                  <UserIcon size={18} color={searchType === 'individual' ? 'var(--gold-primary)' : 'var(--text-muted)'} />
                  INDIVIDUAL
                </button>
                <button 
                  className={`toggle-btn ${searchType === 'business' ? 'active' : ''}`}
                  style={{ flex: 1, height: '100%', fontSize: '0.8rem', letterSpacing: '1px' }}
                  onClick={() => {
                    setSearchType('business');
                    setLastResult(null);
                    setIsVisitLogged(false);
                    setQidSearch('');
                  }}
                >
                  <Building2 size={18} color={searchType === 'business' ? 'var(--gold-primary)' : 'var(--text-muted)'} />
                  BUSINESS
                </button>
              </div>
            </div>
            <div className="search-input-modern">
              <div className="search-prefix">
                {searchType === 'individual' ? <UserIcon size={20} /> : <Building2 size={20} />}
                <ChevronDown size={14} />
              </div>
              <input 
                type="text" 
                placeholder={searchType === 'individual' ? "Enter QID number" : "Enter Commercial Registration Number"} 
                value={qidSearch}
                onChange={(e) => setQidSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button 
                className="search-btn-gold"
                onClick={handleSearch}
              >
                SEARCH
              </button>
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '-24px', marginLeft: '64px' }}>
              {searchType === 'individual' ? "Example: 2847XXXXXXXX" : "Example: 52510"}
            </p>

            {searchType === 'individual' ? (
              <>
                <div 
                  className="vertical-divider-horizontal" 
                  style={{ 
                    position: 'relative', 
                    height: '1px', 
                    background: 'var(--glass-border)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    margin: '8px 0' 
                  }}
                >
                  <span style={{ background: 'var(--bg-color)', padding: '0 16px', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>OR</span>
                </div>

                <button 
                  className="btn-outline-gold" 
                  style={{ width: 'fit-content', alignSelf: 'center', padding: '14px 40px', borderRadius: '12px' }}
                  onClick={handleScan}
                >
                  <Scan size={18} />
                  SCAN ID CARD
                </button>
              </>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '12px', 
                padding: '20px 24px', 
                background: 'rgba(255,255,255,0.02)', 
                border: '1px solid var(--glass-border)', 
                borderRadius: '12px',
                marginTop: '0'
              }}>
                <Info size={18} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                  Enter the Commercial Registration (CR) number to view compliance status and available documents.
                </p>
              </div>
            )}
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
                  <div className="result-card-modern" style={{ padding: '24px' }}>
                    {/* Business Identity Row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div style={{ 
                          width: '56px', height: '56px', borderRadius: '14px', 
                          background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.3)', 
                          display: 'flex', alignItems: 'center', justifyContent: 'center' 
                        }}>
                          <Building2 size={28} color="var(--gold-primary)" />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{lastResult.name}</h3>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>CR Number: {lastResult.qid}</p>
                        </div>
                      </div>
                      <span style={{ 
                        padding: '4px 14px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.8px',
                        background: lastResult.complianceStatus === 'NON-COMPLIANT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                        color: lastResult.complianceStatus === 'NON-COMPLIANT' ? '#ef4444' : 'var(--success)', 
                        border: `1px solid ${lastResult.complianceStatus === 'NON-COMPLIANT' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` 
                      }}>
                        {lastResult.complianceStatus}
                      </span>
                    </div>

                    {/* Compliance + Visit Stats Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', padding: '0 4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Compliance Status</span>
                        <span style={{ 
                          padding: '3px 10px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.5px',
                          background: lastResult.complianceStatus === 'NON-COMPLIANT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: lastResult.complianceStatus === 'NON-COMPLIANT' ? '#ef4444' : 'var(--success)'
                        }}>
                          {lastResult.complianceStatus}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '32px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Last Visit</p>
                          <p style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>{lastResult.lastVisit}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>Total Visits</p>
                          <p style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 700 }}>{lastResult.totalVisits}</p>
                        </div>
                      </div>
                    </div>

                    {/* Available Documents Section */}
                    <div style={{ marginBottom: '20px' }}>
                      <h4 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '14px' }}>AVAILABLE DOCUMENTS</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {lastResult.documents?.map((doc: any, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              {doc.icon === 'user' ? <UserCheck size={15} color="var(--text-muted)" /> : 
                               doc.icon === 'landmark' ? <Landmark size={15} color="var(--text-muted)" /> : 
                               <FileText size={15} color="var(--text-muted)" />}
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{doc.name}</span>
                            </div>
                            <span style={{ 
                              fontSize: '0.65rem', fontWeight: 700, padding: '3px 10px', borderRadius: '4px',
                              background: doc.available ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                              color: doc.available ? 'var(--success)' : '#ef4444',
                              border: `1px solid ${doc.available ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                            }}>
                              {doc.available ? 'Available' : 'Not Available'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* View Full Details Button */}
                    <button className="btn-luxury" style={{ 
                      width: '100%', background: '#111', color: '#fff', 
                      border: '1px solid var(--glass-border)', borderRadius: '12px', 
                      height: '48px', fontSize: '0.8rem', letterSpacing: '1px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                      <ExternalLink size={14} />
                      VIEW FULL DETAILS
                    </button>
                  </div>
                ) : (
                  /* === INDIVIDUAL RESULT CARD === */
                  <IndividualResultCard 
                    result={lastResult} 
                    isVisitLogged={isVisitLogged}
                    onLogVisit={handleLogVisit}
                    onRetry={handleSearch}
                    onScan={handleScan}
                    onDelete={() => {
                      if (window.confirm('Are you sure you want to delete this record from the database?')) {
                        setLastResult(null);
                        alert('Record deleted successfully');
                      }
                    }}
                  />
                )}
              </div>
            ) : (
              <div 
                style={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  border: '1px dashed var(--glass-border)', 
                  borderRadius: '16px', 
                  color: 'var(--text-muted)', 
                  fontSize: '0.85rem' 
                }}
              >
                {searchType === 'individual' ? 'Search or scan to display details' : 'Enter a CR number to view business details'}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Overview Stats Section */}
      <section className="overview-stats-section" style={{ marginTop: '40px' }}>
        <div className="section-header">
          <h2>OVERVIEW STATS</h2>
        </div>
        <div className="stats-cards-grid">
          <StatCard 
            icon={<Users size={24} />} 
            label="TOTAL SCANS" 
            value={(stats?.total_scans ?? 0).toLocaleString()} 
            trend="+ 12.5%" 
            isPositive={true} 
            colorClass="stat-icon-amber"
          />
          <StatCard 
            icon={<UserIcon size={24} />} 
            label="EXISTING USERS" 
            value={(stats?.existing_users ?? 0).toLocaleString()} 
            trend="+ 9.8%" 
            isPositive={true} 
            colorClass="stat-icon-green"
          />
          <StatCard 
            icon={<UserPlus size={24} />} 
            label="NEW USERS" 
            value={(stats?.new_users ?? 0).toLocaleString()} 
            trend="+ 15.3%" 
            isPositive={true} 
            colorClass="stat-icon-blue"
          />
          <StatCard 
            icon={<Clock size={24} />} 
            label="EXPIRING SOON" 
            subLabel="(≤ 30 DAYS)"
            value={(stats?.expiring_soon ?? 0).toLocaleString()} 
            trend="- 4.0%" 
            isPositive={false} 
            colorClass="stat-icon-orange"
          />
          <StatCard 
            icon={<AlertOctagon size={24} />} 
            label="INVALID IDS" 
            value={(stats?.invalid_ids ?? 0).toLocaleString()} 
            trend="+ 6.7%" 
            isPositive={false} 
            colorClass="stat-icon-red"
          />
        </div>
      </section>

      <footer className="dashboard-footer-info" style={{ marginTop: '32px', paddingBottom: '32px' }}>
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
