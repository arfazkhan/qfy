import React from 'react';
import { Settings, HardDrive, Cloud, ShieldCheck, Hash, Scan } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

export const SettingsPage: React.FC = () => {
  const { storageMode, setStorageMode, docType, setDocType } = useSettingsStore();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <div style={{ 
          width: '48px', height: '48px', borderRadius: '12px', 
          background: 'rgba(212, 175, 55, 0.1)', display: 'flex', 
          alignItems: 'center', justifyContent: 'center',
          border: '1px solid var(--glass-border-gold)'
        }}>
          <Settings size={24} color="var(--gold-primary)" />
        </div>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>System Settings</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Configure global scanning and storage preferences</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Storage Configuration */}
        <div className="luxury-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Storage Infrastructure</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
                Define where scanned identity documents and extracted data are persisted. 
                Local storage uses the Tauri filesystem bridge.
              </p>
            </div>
            <div className="storage-toggle-group">
              <button 
                onClick={() => setStorageMode('LOCAL')}
                className={storageMode === 'LOCAL' ? 'storage-btn active' : 'storage-btn'}
              >
                <HardDrive size={14} />
                Local
              </button>
              <button 
                onClick={() => setStorageMode('CLOUD')}
                className={storageMode === 'CLOUD' ? 'storage-btn active' : 'storage-btn'}
              >
                <Cloud size={14} />
                Cloud
              </button>
            </div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <strong>Note:</strong> Cloud storage may incur additional API costs for external blob hosting.
          </div>
        </div>

        {/* OCR Engine Configuration */}
        <div className="luxury-card" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Scanning Intelligence</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
                Configure the default document detection mode. AUTO uses the smart heuristic engine. 
                Forcing a specific type can improve accuracy for difficult scans.
              </p>
            </div>
            <div className="storage-toggle-group">
              <button 
                onClick={() => setDocType('AUTO')}
                className={docType === 'AUTO' ? 'storage-btn active' : 'storage-btn'}
                title="Smart Heuristic Detection"
              >
                <Scan size={14} />
                Auto
              </button>
              <button 
                onClick={() => setDocType('QID')}
                className={docType === 'QID' ? 'storage-btn active' : 'storage-btn'}
                title="Force Qatar ID Parsing"
              >
                <Hash size={14} />
                QID
              </button>
              <button 
                onClick={() => setDocType('PASSPORT')}
                className={docType === 'PASSPORT' ? 'storage-btn active' : 'storage-btn'}
                title="Force Global Passport Parsing"
              >
                <ShieldCheck size={14} />
                Passport
              </button>
            </div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.1)', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--gold-primary)' }}>
            <strong>Optimization:</strong> AUTO mode is recommended for 95% of use cases. Use PASSPORT mode for specialized international document intake.
          </div>
        </div>

        {/* System Information */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Q-FY Forensic Identity System v3.1.0 • All Settings are persisted locally
          </p>
        </div>
      </div>
    </div>
  );
};
