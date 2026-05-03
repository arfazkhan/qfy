import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Scan, User, Link as LinkIcon, X, CheckCircle, AlertCircle } from 'lucide-react';
import { ApiClient } from '../api/client';

interface IdentityPickerProps {
  label: string;
  onLink: (userId: string) => void;
  linkedUser: {
    id: string;
    name: string;
    qid_number: string;
    expiry_date: string;
  } | null;
  onUnlink: () => void;
  role?: 'owner' | 'authorized';
}

export const IdentityPicker: React.FC<IdentityPickerProps> = ({
  label,
  onLink,
  linkedUser,
  onUnlink,
  role = 'owner'
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScanClick = () => {
    const returnUrl = encodeURIComponent(location.pathname);
    navigate(`/scan?returnUrl=${returnUrl}&role=${role}`);
  };

  const handleSearch = async () => {
    if (!searchTerm) return;
    setIsSearching(true);
    setError(null);
    try {
      // Use existing user search endpoint
      const response = await ApiClient.request<any>(`/users/${searchTerm}`, { auth: true });
      if (response) {
        setSearchResult(response.user);
      } else {
        setError('No record found for this QID');
      }
    } catch (err: any) {
      if (err.status === 404) {
        setError('No record found for this QID');
      } else {
        setError('Search failed. Please try again.');
      }
    } finally {
      setIsSearching(false);
    }
  };

  if (linkedUser) {
    const isExpired = new Date(linkedUser.expiry_date) < new Date();
    return (
      <div className="identity-picker-linked">
        <label className="picker-label">{label}</label>
        <div className={`linked-card ${isExpired ? 'expired' : 'valid'}`}>
          <div className="card-icon">
            <User size={20} />
          </div>
          <div className="card-info">
            <div className="name">{linkedUser.name}</div>
            <div className="qid">QID: {linkedUser.qid_number}</div>
            <div className="status-tag">
              {isExpired ? (
                <><AlertCircle size={12} /> ID Expired</>
              ) : (
                <><CheckCircle size={12} /> Active Record</>
              )}
            </div>
          </div>
          <button className="unlink-btn" onClick={onUnlink}>
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="identity-picker">
      <label className="picker-label">{label}</label>
      
      {!searchResult ? (
        <div className="picker-search-group">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search QID to link..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <button 
            className="find-btn" 
            onClick={handleSearch}
            disabled={isSearching || !searchTerm}
          >
            {isSearching ? '...' : 'Find'}
          </button>
          <div className="divider">OR</div>
          <button className="scan-new-btn" onClick={handleScanClick}>
            <Scan size={18} />
            Scan New
          </button>
        </div>
      ) : (
        <div className="search-preview-card">
          <div className="preview-info">
            <div className="name">{searchResult.name}</div>
            <div className="qid">QID: {searchResult.qid_number}</div>
          </div>
          <div className="preview-actions">
            <button className="cancel-preview" onClick={() => setSearchResult(null)}>Cancel</button>
            <button className="link-action-btn" onClick={() => onLink(searchResult.id)}>
              <LinkIcon size={16} /> Link
            </button>
          </div>
        </div>
      )}
      
      {error && <div className="picker-error">{error}</div>}
      
      <style>{`
        .identity-picker {
          margin-bottom: 24px;
        }
        .picker-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 700;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }
        .picker-search-group {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(255,255,255,0.03);
          padding: 8px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .search-input-wrapper {
          position: relative;
          flex: 1;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.3);
        }
        .search-input-wrapper input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 10px 10px 10px 38px;
          color: #fff;
          font-size: 0.9rem;
        }
        .find-btn {
          background: var(--primary-color, #3b82f6);
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          font-weight: 600;
          cursor: pointer;
        }
        .divider {
          font-size: 0.65rem;
          font-weight: 800;
          color: rgba(255,255,255,0.2);
        }
        .scan-new-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.05);
          color: #fff;
          border: 1px dashed rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 600;
          cursor: pointer;
        }
        .linked-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.1);
          position: relative;
        }
        .linked-card.valid { border-left: 4px solid #10b981; }
        .linked-card.expired { border-left: 4px solid #ef4444; }
        .card-icon {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-info .name { font-weight: 700; color: #fff; }
        .card-info .qid { font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .status-tag {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          margin-top: 4px;
          text-transform: uppercase;
        }
        .valid .status-tag { color: #10b981; }
        .expired .status-tag { color: #ef4444; }
        .unlink-btn {
          position: absolute;
          right: 12px;
          top: 12px;
          background: rgba(255,255,255,0.05);
          border: none;
          color: rgba(255,255,255,0.3);
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
        }
        .search-preview-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          padding: 16px;
          border-radius: 12px;
        }
        .link-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #3b82f6;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .cancel-preview {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.5);
          margin-right: 12px;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .picker-error {
          font-size: 0.75rem;
          color: #ef4444;
          margin-top: 8px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};
