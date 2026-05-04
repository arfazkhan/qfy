import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  Clock, 
  Eye, 
  Camera
} from 'lucide-react';
import { ApiClient } from '../api/client';

interface DocumentUploadRowProps {
  crNumber: string;
  docType: string;
  existingDoc?: {
    is_available: boolean;
    expiry_date?: string;
    file_url?: string;
    original_filename?: string;
  };
  onUpdate: () => void;
}

export const DocumentUploadRow: React.FC<DocumentUploadRowProps> = ({
  crNumber,
  docType,
  existingDoc,
  onUpdate
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [expiryDate, setExpiryDate] = useState(existingDoc?.expiry_date || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('document_type', docType);
      formData.append('is_available', 'true');
      if (expiryDate) formData.append('expiry_date', expiryDate);
      formData.append('file', file);

      await ApiClient.post(`/businesses/${crNumber}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onUpdate();
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualCheck = async () => {
    try {
      const formData = new FormData();
      formData.append('document_type', docType);
      formData.append('is_available', (!existingDoc?.is_available).toString());
      if (expiryDate) formData.append('expiry_date', expiryDate);

      await ApiClient.post(`/businesses/${crNumber}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onUpdate();
    } catch (err) {
      console.error('Update failed', err);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExpiryDate(e.target.value);
  };

  const getFullFileUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return `${baseUrl}/${path}`;
  };

  const isExpired = existingDoc?.expiry_date && new Date(existingDoc.expiry_date) < new Date();

  return (
    <div className="doc-upload-row">
      <div className="doc-main-info">
        <div className={`doc-icon-box ${existingDoc?.is_available ? 'success' : 'danger'}`}>
          <FileText size={20} />
        </div>
        <div className="doc-text">
          <h4>{docType}</h4>
          <div className="doc-meta">
            <span className={`status-pill ${existingDoc?.is_available ? 'success' : 'danger'}`}>
              {existingDoc?.is_available ? (isExpired ? 'EXPIRED' : 'AVAILABLE') : 'MISSING'}
            </span>
            {existingDoc?.file_url && (
              <a 
                href={getFullFileUrl(existingDoc.file_url)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="view-link"
              >
                <Eye size={12} /> View File
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="doc-actions">
        <div className="date-input-group">
          <Clock size={14} className="date-icon" />
          <input 
            type="date" 
            value={expiryDate} 
            onChange={handleDateChange}
            className="mini-date-picker"
          />
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          style={{ display: 'none' }} 
          accept="image/*,application/pdf"
        />

        <div className="btn-group-luxury">
          <button 
            className={`action-btn ${existingDoc?.is_available ? 'active' : ''}`}
            onClick={handleManualCheck}
            title="Mark as Checked"
          >
            <CheckCircle size={16} />
          </button>
          
          <button 
            className="action-btn upload"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Upload Document"
          >
            {isUploading ? <div className="spinner-mini" /> : <Upload size={16} />}
          </button>

          <button 
            className="action-btn scan"
            title="Scan with Camera"
          >
            <Camera size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .doc-upload-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          margin-bottom: 12px;
          transition: all 0.2s ease;
        }
        .doc-upload-row:hover {
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.2);
        }
        .doc-main-info {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .doc-icon-box {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          color: var(--text-muted);
        }
        .doc-icon-box.success {
          background: rgba(16, 185, 129, 0.1);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.2);
        }
        .doc-icon-box.danger {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
        }
        .doc-text h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }
        .doc-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .status-pill {
          font-size: 0.6rem;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }
        .status-pill.success { background: #10b98120; color: #10b981; }
        .status-pill.danger { background: #ef444420; color: #ef4444; }
        
        .view-link {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--gold-primary);
          text-decoration: none;
          opacity: 0.8;
        }
        .view-link:hover { opacity: 1; }

        .doc-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .date-input-group {
          position: relative;
          display: flex;
          align-items: center;
        }
        .date-icon {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .mini-date-picker {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          color: #fff;
          font-size: 0.75rem;
          padding: 6px 8px 6px 30px;
          width: 130px;
          outline: none;
        }
        
        .btn-group-luxury {
          display: flex;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 2px;
        }
        .action-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: var(--text-muted);
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .action-btn:hover {
          background: rgba(255,255,255,0.05);
          color: #fff;
        }
        .action-btn.active {
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }
        .action-btn.upload:hover {
          color: var(--gold-primary);
          background: rgba(212, 175, 55, 0.1);
        }
        
        .spinner-mini {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--gold-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
