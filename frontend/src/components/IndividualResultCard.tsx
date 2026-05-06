import React from 'react';
import { 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  Search, 
  Scan, 
  RefreshCcw,
  Clock,
  Hash
} from 'lucide-react';


export type ResultStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'GRACE_PERIOD' | 'INVALID' | 'NOT_FOUND' | 'SYSTEM_ERROR' | 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';

export interface IndividualResult {
  status: ResultStatus;
  name?: string;
  qid?: string;
  expiry?: string;
  daysLeft?: number;
  daysExpired?: number;
  graceDaysRemaining?: number;
  lastSeen?: string;
  visits?: number;
  frontImage?: string;
  backImage?: string;
  mobile_number?: string;
  errorMessage?: string;
  type?: 'individual' | 'business';
}

interface IndividualResultCardProps {
  result: IndividualResult;
  isVisitLogged: boolean;
  onLogVisit: () => void;
  onRetry?: () => void;
  onScan?: () => void;
  onDetails?: () => void;
}

export const IndividualResultCard: React.FC<IndividualResultCardProps> = ({ 
  result, 
  isVisitLogged, 
  onLogVisit, 
  onRetry,
  onScan,
  onDetails,
}) => {
  const getStatusBadge = () => {
    switch (result.status) {
      case 'ACTIVE':
      case 'COMPLIANT':
        return (
          <div className="badge-active-modern">
            <CheckCircle2 size={12} />
            {result.status === 'COMPLIANT' ? 'COMPLIANT' : 'ID VALID'}
          </div>
        );
      case 'EXPIRING_SOON':
      case 'PARTIAL':
        return (
          <div className="badge-warning-modern" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} />
            {result.status === 'PARTIAL' ? 'PARTIAL' : 'EXPIRING SOON'}
          </div>
        );
      case 'GRACE_PERIOD':
        return (
          <div className="badge-warning-modern" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCcw size={12} />
            GRACE PERIOD
          </div>
        );
      case 'INVALID':
      case 'NON_COMPLIANT':
        return (
          <div className="badge-danger-modern" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} />
            {result.status === 'NON_COMPLIANT' ? 'NON-COMPLIANT' : 'INACTIVE'}
          </div>
        );
      default:
        return null;
    }
  };

  const getExpiryContent = () => {
    switch (result.status) {
      case 'ACTIVE':
        return (
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>VALID UNTIL</p>
            <h4 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 900, margin: '4px 0' }}>{result.expiry}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 700, fontSize: '0.85rem' }}>
              <CheckCircle2 size={14} />
              {result.daysLeft} days remaining
            </div>
          </div>
        );
      case 'EXPIRING_SOON':
        return (
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>EXPIRING SOON</p>
            <h4 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 900, margin: '4px 0' }}>{result.expiry}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>
              <Clock size={14} />
              {result.daysLeft} days remaining
            </div>
          </div>
        );
      case 'GRACE_PERIOD':
        return (
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>GRACE PERIOD</p>
            <h4 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 900, margin: '4px 0' }}>{result.expiry}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700, fontSize: '0.85rem' }}>
              <RefreshCcw size={14} />
              {result.graceDaysRemaining} grace days left
            </div>
          </div>
        );
      case 'INVALID':
      case 'NON_COMPLIANT':
        return (
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.5px' }}>STATUS</p>
            <h4 style={{ fontSize: '1.6rem', color: '#fff', fontWeight: 900, margin: '4px 0' }}>{result.status === 'NON_COMPLIANT' ? 'NON-COMPLIANT' : result.expiry}</h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', fontWeight: 700, fontSize: '0.85rem' }}>
              <AlertTriangle size={14} />
              {result.status === 'NON_COMPLIANT' ? 'Compliance Failed' : `Expired ${result.daysExpired} days ago`}
            </div>
          </div>
        );
      case 'COMPLIANT':
        return (
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Compliance</p>
            <h4 style={{ fontSize: '1.4rem', color: 'var(--success)', fontWeight: 800, margin: '8px 0' }}>VERIFIED</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All documents valid</p>
          </div>
        );
      case 'PARTIAL':
        return (
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Compliance</p>
            <h4 style={{ fontSize: '1.4rem', color: '#f59e0b', fontWeight: 800, margin: '8px 0' }}>PARTIAL</h4>
            <p style={{ fontSize: '0.75rem', color: '#f59e0b', opacity: 0.8 }}>Warnings present</p>
          </div>
        );
      default:
        return null;
    }
  };

  const getCardStatusClass = () => {
    switch (result.status) {
      case 'ACTIVE': 
      case 'COMPLIANT': return 'status-success';
      case 'EXPIRING_SOON': 
      case 'PARTIAL':
      case 'GRACE_PERIOD': return 'status-warning';
      case 'INVALID': 
      case 'NON_COMPLIANT': return 'status-danger';
      case 'NOT_FOUND':
      case 'SYSTEM_ERROR': return 'status-muted';
      default: return '';
    }
  };

  if (result.status === 'NOT_FOUND') {
    return (
      <div className={`result-card-modern ${getCardStatusClass()}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
            <Search size={32} color="var(--text-muted)" />
          </div>
          <div style={{ position: 'absolute', top: 0, right: -10, padding: '4px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800, color: 'var(--text-muted)', border: '1px solid var(--glass-border)' }}>
            NOT FOUND
          </div>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>No record found</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: '1.6', marginBottom: '32px' }}>
          We couldn't find any match for the provided QID or CR number.
        </p>
        <button 
          className="btn-outline-gold" 
          style={{ padding: '12px 32px' }}
          onClick={onScan}
        >
          <Scan size={18} />
          SCAN ID
        </button>
      </div>
    );
  }

  if (result.status === 'SYSTEM_ERROR') {
    return (
      <div className={`result-card-modern ${getCardStatusClass()}`} style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px' }}>
        <div style={{ position: 'relative', marginBottom: '24px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertTriangle size={32} color="var(--danger)" />
          </div>
          <div style={{ position: 'absolute', top: 0, right: -15, padding: '4px 10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', fontSize: '0.6rem', fontWeight: 800, color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            SYSTEM ERROR
          </div>
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Unable to fetch data</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: '1.6', marginBottom: '32px' }}>
          {result.errorMessage || 'Something went wrong while processing your request.'}
        </p>
        <button 
          className="btn-outline-gold" 
          style={{ borderColor: 'var(--danger)', color: 'var(--danger)', padding: '12px 32px' }}
          onClick={onRetry}
        >
          <RefreshCcw size={18} />
          RETRY
        </button>
      </div>
    );
  }

  return (
    <div className={`result-card-modern ${getCardStatusClass()} ${isVisitLogged ? 'animate-success-pulse' : ''} animate-scale-up`} style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <div 
            style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: '#1a1a1a', 
              border: '1px solid var(--glass-border)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              overflow: 'hidden'
            }}
          >
            {(() => {
              const initials = result.name ? result.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?';
              return (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%)',
                  color: 'var(--gold-primary)',
                  fontSize: '1.2rem',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  border: '1px solid var(--glass-border)'
                }}>
                  {initials}
                </div>
              );
            })()}
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{result.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>QID: {result.qid}</p>
          </div>
        </div>
        <div className={isVisitLogged ? 'animate-pop-in' : ''}>
          {getStatusBadge()}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '32px', paddingLeft: '8px' }}>
        {getExpiryContent()}
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Last Seen</p>
          <h4 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 800, margin: '8px 0' }}>{result.lastSeen}</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gold-primary)', fontWeight: 700, fontSize: '0.8rem' }}>
            <Hash size={14} />
            {result.mobile_number || 'No Mobile Registered'}
          </div>
        </div>
      </div>

      {/* QID Document Images */}
      {(result.frontImage || result.backImage) && (
        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '1px', marginBottom: '12px', textTransform: 'uppercase' }}>IDENTIFICATION DOCUMENTS</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: '100%', 
                height: '220px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                border: '1px solid var(--glass-border)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {result.frontImage ? (
                  <img 
                    src={result.frontImage.startsWith('http') ? result.frontImage : `http://localhost:8000${result.frontImage}`} 
                    alt="QID Front" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Front Not Available</div>
                )}
              </div>
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>FRONT</span>
            </div>
            
            <div style={{ position: 'relative' }}>
              <div style={{ 
                width: '100%', 
                height: '220px', 
                background: 'rgba(255,255,255,0.03)', 
                borderRadius: '12px', 
                border: '1px solid var(--glass-border)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {result.backImage ? (
                  <img 
                    src={result.backImage.startsWith('http') ? result.backImage : `http://localhost:8000${result.backImage}`} 
                    alt="QID Back" 
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Back Not Available</div>
                )}
              </div>
              <span style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 700 }}>BACK</span>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        {result.status !== 'INVALID' && (
          !isVisitLogged ? (
            <button 
              className="btn-gold" 
              style={{ 
                flex: 2, 
                height: '48px', 
                fontSize: '0.8rem', 
                letterSpacing: '1px', 
                background: 'linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-secondary) 100%)',
                color: '#000',
                border: 'none'
              }}
              onClick={onLogVisit}
            >
              LOG VISIT
            </button>
          ) : (
            <div style={{ flex: 2, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 800 }}>
              <CheckCircle2 size={16} />
              LOGGED
            </div>
          )
        )}
        
        {(result.status === 'GRACE_PERIOD' || result.status === 'INVALID') && (
          <button 
            className="btn-luxury" 
            style={{ flex: 1, height: '48px', fontSize: '0.8rem' }}
            onClick={onScan}
          >
            RE-SCAN
            <RefreshCcw size={14} style={{ marginLeft: 'auto' }} />
          </button>
        )}

        <button 
          className="btn-luxury" 
          style={{ flex: 1, height: '48px', fontSize: '0.8rem', letterSpacing: '1px' }}
          onClick={onDetails}
        >
          DETAILS
          <ExternalLink size={14} style={{ marginLeft: 'auto' }} />
        </button>
      </div>
    </div>
  );
};
