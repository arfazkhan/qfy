import React from 'react';
import { 
  User as UserIcon, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  Search, 
  Scan, 
  RefreshCcw,
  Hash
} from 'lucide-react';
import { ApiClient } from '../api/client';

export type ResultStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'GRACE_PERIOD' | 'INVALID' | 'NOT_FOUND' | 'SYSTEM_ERROR';

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
  mobile_number?: string;
  errorMessage?: string;
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
        return (
          <div className="badge-active-modern">
            <CheckCircle2 size={12} />
            ACTIVE
          </div>
        );
      case 'EXPIRING_SOON':
        return (
          <div className="badge-warning-modern" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} />
            EXPIRING SOON
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
        return (
          <div className="badge-danger-modern" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={12} />
            INACTIVE
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
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expires in</p>
            <h4 style={{ fontSize: '1.4rem', color: 'var(--success)', fontWeight: 800, margin: '8px 0' }}>{result.daysLeft} days</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expiry Date: {result.expiry}</p>
          </div>
        );
      case 'EXPIRING_SOON':
        return (
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expires in</p>
            <h4 style={{ fontSize: '1.4rem', color: '#f59e0b', fontWeight: 800, margin: '8px 0' }}>{result.daysLeft} days</h4>
            <p style={{ fontSize: '0.75rem', color: '#f59e0b', opacity: 0.8 }}>Expiry Date: {result.expiry}</p>
          </div>
        );
      case 'GRACE_PERIOD':
        return (
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Inactive</p>
            <h4 style={{ fontSize: '1.4rem', color: '#f59e0b', fontWeight: 800, margin: '8px 0' }}>{result.daysExpired} days ago</h4>
            <p style={{ fontSize: '0.75rem', color: '#f59e0b', opacity: 0.8 }}>Grace period: {result.graceDaysRemaining} days remaining</p>
          </div>
        );
      case 'INVALID':
        return (
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Inactive</p>
            <h4 style={{ fontSize: '1.4rem', color: 'var(--danger)', fontWeight: 800, margin: '8px 0' }}>{result.daysExpired} days ago</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--danger)', opacity: 0.8 }}>Expiry Date: {result.expiry}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const getCardStatusClass = () => {
    switch (result.status) {
      case 'ACTIVE': return 'status-success';
      case 'EXPIRING_SOON': 
      case 'GRACE_PERIOD': return 'status-warning';
      case 'INVALID': return 'status-danger';
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
    <div className={`result-card-modern ${getCardStatusClass()}`} style={{ padding: '24px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
