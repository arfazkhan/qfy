import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Scan,
  ChevronLeft, 
  ShieldCheck, 
  CheckCircle2,
  Image as ImageIcon,
  Eye,
  RotateCcw,
  HelpCircle,
  X,
  Plus,
  Edit2,
  Hash
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ApiClient } from '../api/client';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface ImageState {
  file: File | null;
  preview: string | null;
  base64: string | null;
  name: string;
  size: string;
  status: 'idle' | 'processed' | 'uploaded' | 'uploading';
}

export const ScanPage: React.FC = () => {
  const navigate = useNavigate();
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  
  const [frontImage, setFrontImage] = useState<ImageState>({
    file: null, preview: null, base64: null, name: '', size: '', status: 'idle'
  });
  const [backImage, setBackImage] = useState<ImageState>({
    file: null, preview: null, base64: null, name: '', size: '', status: 'idle'
  });
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('974');

  useEffect(() => {
    if (scanResult?.user) {
      setEditedData({ ...scanResult.user });
    }
  }, [scanResult]);

  const handleValueChange = (field: string, value: string) => {
    setEditedData((prev: any) => ({ ...prev, [field]: value }));
    if (scanResult?.user[field] !== value) {
      setModifiedFields(prev => new Set(prev).add(field));
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFrontSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const base64 = await fileToBase64(file);
    const preview = URL.createObjectURL(file);
    
    setFrontImage({
      file,
      preview,
      base64,
      name: file.name,
      size: formatFileSize(file.size),
      status: 'uploading'
    });

    await processScan(file);
  };

  const handleBackSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const base64 = await fileToBase64(file);
    const preview = URL.createObjectURL(file);
    
    setBackImage({
      file,
      preview,
      base64,
      name: file.name,
      size: formatFileSize(file.size),
      status: 'uploaded'
    });
  };

  const processScan = async (file: File) => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await ApiClient.post<any>('/scan', formData);
      setScanResult(response);
      
      // Update preview to show the processed/warped image from backend
      if (response.processed_image) {
        setPreviewUrl(`data:image/jpeg;base64,${response.processed_image}`);
      }
      
      setFrontImage(prev => ({ ...prev, status: 'processed' }));
    } catch (err: any) {
      setError(err.message || 'Scan failed. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveAndLog = async () => {
    if (!scanResult) {
      setError('Please upload and scan the front side first.');
      return;
    }
    if (!backImage.preview) {
      setError('Please upload the back side image to proceed.');
      return;
    }
    try {
      const userData = {
        ...editedData,
        front_image: frontImage.base64,
        back_image: backImage.base64,
        manual_edit: modifiedFields.size > 0,
        modified_fields: Array.from(modifiedFields),
        mobile_number: `+${mobileNumber}`
      };
      
      const userResponse = await ApiClient.post<any>('/users/upsert', userData);
      await ApiClient.post(`/users/${userData.qid_number}/visit`, {
        manual_rectification: modifiedFields.size > 0
      });
      
      setIsMobileModalOpen(false);
      
      const returnUrl = new URLSearchParams(window.location.search).get('returnUrl');
      const role = new URLSearchParams(window.location.search).get('role');
      
      if (returnUrl) {
        // Redirect back with the user ID and role context
        const connector = returnUrl.includes('?') ? '&' : '?';
        navigate(`${returnUrl}${connector}linked_id=${userResponse.id}&role=${role || 'owner'}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('Failed to save record: ' + err.message);
    }
  };

  const handleInitialSaveClick = () => {
    if (!scanResult) {
      setError('Please upload and scan the front side first.');
      return;
    }
    // Removing the back image requirement as discussed or if it's optional
    if (!editedData) return;
    
    setIsMobileModalOpen(true);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      <style>{`
        .phone-input-luxury .form-control {
          font-family: inherit !important;
          border-color: var(--glass-border) !important;
          transition: all 0.3s ease !important;
        }
        .phone-input-luxury .form-control:focus {
          border-color: var(--gold-primary) !important;
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.1) !important;
        }
        .phone-input-luxury .flag-dropdown {
          background: transparent !important;
          border: none !important;
        }
        .phone-input-luxury .selected-flag {
          background: transparent !important;
          padding-left: 20px !important;
        }
        .phone-input-luxury .selected-flag:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .phone-input-luxury .country-list {
          background-color: #121212 !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 12px !important;
          margin-top: 8px !important;
          padding: 8px !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6) !important;
          width: 300px !important;
        }
        .phone-input-luxury .country-list .search {
          padding: 8px 12px !important;
          background-color: #121212 !important;
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
        }
        .phone-input-luxury .country-list .search-box {
          background-color: rgba(255,255,255,0.03) !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 8px !important;
          color: #fff !important;
          width: 100% !important;
          padding: 10px 12px !important;
          margin: 0 !important;
        }
        .phone-input-luxury .country-list .search-emoji {
          display: none !important;
        }
        .phone-input-luxury .country-list .country {
          padding: 10px 12px !important;
          border-radius: 8px !important;
          transition: all 0.2s ease !important;
        }
        .phone-input-luxury .country-list .country:hover {
          background-color: rgba(255,255,255,0.05) !important;
        }
        .phone-input-luxury .country-list .country.highlight {
          background-color: var(--gold-muted) !important;
          color: var(--gold-primary) !important;
        }
        .phone-input-luxury .country-list .country-name {
          font-weight: 500 !important;
          color: #eee !important;
        }
        .phone-input-luxury .country-list .dial-code {
          color: var(--text-muted) !important;
        }
        .phone-input-luxury .country-list .country.highlight .country-name,
        .phone-input-luxury .country-list .country.highlight .dial-code {
          color: inherit !important;
        }
        /* Custom scrollbar for dropdown */
        .phone-input-luxury .country-list::-webkit-scrollbar {
          width: 6px;
        }
        .phone-input-luxury .country-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .phone-input-luxury .country-list::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
        }
        .phone-input-luxury .country-list::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.2);
        }
      `}</style>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-muted)', 
              fontSize: '0.7rem', 
              fontWeight: 800, 
              letterSpacing: '1px', 
              cursor: 'pointer',
              marginBottom: '12px',
              padding: 0
            }}
          >
            <ChevronLeft size={14} />
            BACK TO DASHBOARD
          </button>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>SCAN ID</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>Upload or scan ID card to extract information</p>
        </div>
        <button className="btn-luxury" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 24px', borderRadius: '12px' }}>
          <HelpCircle size={18} />
          Help Center
        </button>
      </div>

      <div className="scan-page-grid">
        {/* Left Column - Upload Cards */}
        <div className="scan-column-left">
          {/* Front Side Card */}
          <div className="scan-upload-card">
            <div className="scan-card-label">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--gold-muted)', padding: '8px', borderRadius: '8px' }}>
                  <ImageIcon size={20} color="var(--gold-primary)" />
                </div>
                <div>
                  <h3>FRONT SIDE <span style={{ color: 'var(--text-muted)' }}>(Required)</span></h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>This side will be used for data extraction</p>
                </div>
              </div>
              {frontImage.status === 'processed' && (
                <div className="badge-active-modern" style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                  <CheckCircle2 size={14} />
                  Processed
                </div>
              )}
            </div>

            <div 
              className={`scan-preview-container ${frontImage.preview ? 'has-image' : ''}`}
              onClick={() => !frontImage.preview && frontInputRef.current?.click()}
            >
              {frontImage.preview ? (
                <img src={previewUrl || frontImage.preview} className="scan-preview-image" alt="Front ID" />
              ) : (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                    <button 
                      className="btn-gold" 
                      style={{ padding: '16px 24px', height: 'auto', flexDirection: 'column', gap: '8px', width: '140px' }}
                      onClick={() => {/* Trigger USB Scanner Logic */}}
                    >
                      <Scan size={24} />
                      <span style={{ fontSize: '0.7rem' }}>SCAN FROM USB</span>
                    </button>
                    <button 
                      className="btn-luxury" 
                      style={{ padding: '16px 24px', height: 'auto', flexDirection: 'column', gap: '8px', width: '140px' }}
                      onClick={() => frontInputRef.current?.click()}
                    >
                      <Upload size={24} />
                      <span style={{ fontSize: '0.7rem' }}>UPLOAD IMAGE</span>
                    </button>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Drag and drop front side here as an alternative</p>
                </div>
              )}
              {isScanning && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                  <div className="scanning-line" style={{ height: '3px' }} />
                  <div className="animate-pulse-gold" style={{ textAlign: 'center' }}>
                    <div className="spinner-gold" style={{ margin: '0 auto 16px', width: '32px', height: '32px' }} />
                    <p style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '2px' }}>AI ANALYZING...</p>
                  </div>
                </div>
              )}
            </div>

            {frontImage.preview && (
              <>
                <div className="scan-file-meta">
                  <span>{frontImage.name}</span>
                  <span>{frontImage.size}</span>
                </div>
                <div className="scan-card-actions">
                  <button className="btn-luxury" style={{ flex: 1 }} onClick={() => setFullscreenImage(previewUrl || frontImage.preview)}>
                    <Eye size={16} /> Preview
                  </button>
                  <button className="btn-luxury" style={{ flex: 1 }} onClick={() => frontInputRef.current?.click()}>
                    <RotateCcw size={16} /> Replace
                  </button>
                </div>
              </>
            )}
            <input type="file" ref={frontInputRef} style={{ display: 'none' }} onChange={handleFrontSelect} accept="image/*" />
          </div>

          {/* Back Side Card */}
          <div className="scan-upload-card">
            <div className="scan-card-label">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px' }}>
                  <ImageIcon size={20} color="var(--text-muted)" />
                </div>
                <div>
                  <h3>BACK SIDE <span style={{ color: 'var(--text-muted)' }}>(Optional)</span></h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stored for reference only (no data extraction)</p>
                </div>
              </div>
              {backImage.status === 'uploaded' && (
                <div className="badge-active-modern" style={{ color: '#6366f1', background: 'rgba(99, 102, 241, 0.05)', borderColor: 'rgba(99, 102, 241, 0.2)' }}>
                  <CheckCircle2 size={14} />
                  Uploaded
                </div>
              )}
            </div>

            <div 
              className={`scan-preview-container ${backImage.preview ? 'has-image' : ''}`}
              onClick={() => !backImage.preview && backInputRef.current?.click()}
            >
              {backImage.preview ? (
                <img src={backImage.preview} className="scan-preview-image" alt="Back ID" />
              ) : (
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '24px' }}>
                    <button 
                      className="btn-luxury" 
                      style={{ padding: '16px 24px', height: 'auto', flexDirection: 'column', gap: '8px', width: '140px', borderColor: 'var(--glass-border)' }}
                      onClick={() => {/* Trigger USB Scanner Logic */}}
                    >
                      <Scan size={24} />
                      <span style={{ fontSize: '0.7rem' }}>SCAN FROM USB</span>
                    </button>
                    <button 
                      className="btn-luxury" 
                      style={{ padding: '16px 24px', height: 'auto', flexDirection: 'column', gap: '8px', width: '140px', borderColor: 'var(--glass-border)' }}
                      onClick={() => backInputRef.current?.click()}
                    >
                      <Plus size={24} />
                      <span style={{ fontSize: '0.7rem' }}>UPLOAD IMAGE</span>
                    </button>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Drag and drop back side here as an alternative</p>
                </div>
              )}
            </div>

            {backImage.preview && (
              <>
                <div className="scan-file-meta">
                  <span>{backImage.name}</span>
                  <span>{backImage.size}</span>
                </div>
                <div className="scan-card-actions">
                  <button className="btn-luxury" style={{ flex: 1 }} onClick={() => setPreviewUrl(backImage.preview)}>
                    <Eye size={16} /> Preview
                  </button>
                  <button className="btn-luxury" style={{ flex: 1 }} onClick={() => backInputRef.current?.click()}>
                    <RotateCcw size={16} /> Replace
                  </button>
                </div>
              </>
            )}
            <input type="file" ref={backInputRef} style={{ display: 'none' }} onChange={handleBackSelect} accept="image/*" />
          </div>
        </div>

        {/* Right Column - Extracted Panel */}
        <div className="scan-column-right">
          <div className="scan-extracted-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>EXTRACTED INFORMATION</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {scanResult && (
                  <span className={`status-badge-${scanResult.status.toLowerCase()}`}>
                    {scanResult.status.replace('_', ' ')}
                  </span>
                )}
                {scanResult && <span className="badge-active-modern">Auto Extracted</span>}
              </div>
            </div>

              <div className="extraction-table">
                {[
                  { label: 'Full Name', field: 'name', value: editedData?.name },
                  { label: 'QID Number', field: 'qid_number', value: editedData?.qid_number },
                  { label: 'Date of Birth', field: 'dob', value: editedData?.dob },
                  { label: 'Nationality', field: 'nationality', value: editedData?.nationality },
                  { label: 'Date of Expiry', field: 'expiry_date', value: editedData?.expiry_date },
                ].map((row, i) => (
                  <div className="extraction-row" key={i}>
                    <span className="extraction-label">{row.label}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, justifyContent: 'flex-end' }}>
                      {editingField === row.field ? (
                        <input 
                          autoFocus
                          className="input-luxury"
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: '28px', width: '160px', textAlign: 'right' }}
                          value={row.value || ''}
                          onChange={(e) => handleValueChange(row.field, e.target.value)}
                          onBlur={() => setEditingField(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
                        />
                      ) : (
                        <span 
                          className="extraction-value" 
                          style={{ 
                            color: row.value ? (modifiedFields.has(row.field) ? 'var(--gold-primary)' : '#fff') : 'var(--text-muted)',
                            cursor: 'pointer'
                          }}
                          onClick={() => scanResult && setEditingField(row.field)}
                        >
                          {row.value || (frontImage.preview ? <div className="skeleton-line" style={{ width: '100px', marginLeft: 'auto' }} /> : '—')}
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {scanResult && !editingField && (
                          <Edit2 
                            size={12} 
                            style={{ cursor: 'pointer', opacity: 0.3 }} 
                            onClick={() => setEditingField(row.field)}
                          />
                        )}
                        <span className="extraction-check" style={{ opacity: row.value ? 1 : 0.05 }}>
                          <CheckCircle2 size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            <div style={{ marginTop: '32px', padding: '20px 0', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gold-primary)', marginBottom: '16px' }}>EXTRACTION SUMMARY</h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Extraction Source</span>
                <span style={{ color: scanResult ? 'var(--success)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {scanResult ? 'Front Side (OCR)' : 'None'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Back Side</span>
                <span style={{ color: backImage.preview ? 'var(--gold-primary)' : 'var(--text-muted)', fontWeight: 700 }}>
                  {backImage.preview ? 'Available (Reference Only)' : 'Not Uploaded'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Confidence Score</span>
                <span style={{ color: scanResult ? 'var(--success)' : 'var(--text-muted)', fontWeight: 800 }}>
                  {scanResult ? (scanResult.ocr_confidence * 100).toFixed(0) : '0'}%
                </span>
              </div>
              <div className="confidence-bar-container">
                <div className="confidence-bar" style={{ width: scanResult ? `${scanResult.ocr_confidence * 100}%` : '0%' }}></div>
              </div>

              {scanResult && (
                <div className={`status-banner-${scanResult.status.toLowerCase()}`} style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {scanResult.status === 'ACTIVE' && <ShieldCheck size={18} />}
                    {scanResult.status === 'GRACE_PERIOD' && <RotateCcw size={18} />}
                    {scanResult.status === 'EXPIRING_SOON' && <HelpCircle size={18} />}
                    {scanResult.status === 'INVALID' && <X size={18} />}
                    <span style={{ fontWeight: 600 }}>{scanResult.status_message}</span>
                  </div>
                </div>
              )}
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '12px' }}>All data extracted from front side of the ID card.</p>
            </div>

            <div style={{ marginTop: '32px' }}>
              {error && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', marginBottom: '16px', fontSize: '0.8rem', padding: '12px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px' }}>
                  <X size={14} />
                  {error}
                </div>
              )}
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--gold-primary)', marginBottom: '16px' }}>NEXT ACTION</h4>
              <button 
                className="btn-gold" 
                style={{ 
                  width: '100%', 
                  height: '56px', 
                  fontSize: '1rem',
                  opacity: !scanResult ? 0.6 : 1,
                  cursor: !scanResult ? 'not-allowed' : 'pointer',
                  filter: !scanResult ? 'grayscale(0.5)' : 'none'
                }} 
                onClick={handleInitialSaveClick}
                disabled={!scanResult}
              >
                <CheckCircle2 size={18} style={{ marginRight: '10px' }} />
                {!scanResult ? 'Process ID to Save' : 'Save & Log Visit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '40px', padding: '24px 0', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--gold-primary)' }}>
          <HelpCircle size={18} />
          <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>TIP: <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Ensure the front side is clear and well-lit for best extraction results.</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            <ShieldCheck size={16} /> Secure. Fast. Intelligent.
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Q-fy v1.0.0 · © 2026 Q-fy. All rights reserved.
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {fullscreenImage && (
        <div className="modal-overlay" onClick={() => setFullscreenImage(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setFullscreenImage(null)}>
              <X size={20} />
            </button>
            <img src={fullscreenImage} style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '16px' }} alt="Preview" />
          </div>
        </div>
      )}

      <style>{`
        .animate-spin { animation: spin 2s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        
        .scanning-line {
          position: absolute;
          width: 100%;
          height: 2px;
          background: var(--gold-primary);
          box-shadow: 0 0 15px var(--gold-primary);
          animation: scan-line 2.5s ease-in-out infinite;
          z-index: 10;
        }
        
        @keyframes scan-line {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }

        .skeleton-line {
          height: 8px;
          background: rgba(197, 160, 89, 0.05);
          border-radius: 4px;
          position: relative;
          overflow: hidden;
        }

        .skeleton-line::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(197, 160, 89, 0.1), transparent);
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
      {/* Mobile Number Modal */}
      {isMobileModalOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="modal-content-luxury animate-scale-up" style={{ width: '650px', padding: '40px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ background: 'var(--gold-muted)', padding: '12px', borderRadius: '12px' }}>
                  <Hash size={24} color="var(--gold-primary)" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>MOBILE NUMBER</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enter contact number to complete log</p>
                </div>
              </div>
              <button 
                className="btn-icon" 
                onClick={() => setIsMobileModalOpen(false)}
                style={{ background: 'rgba(255,255,255,0.03)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px' }}>MOBILE NUMBER (INTERNATIONAL)</label>
                <div className="phone-input-luxury">
                  <PhoneInput
                    country={'qa'}
                    enableSearch={true}
                    value={mobileNumber}
                    onChange={(phone) => setMobileNumber(phone)}
                    containerStyle={{ width: '100%' }}
                    inputStyle={{
                      width: '100%',
                      height: '64px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '16px',
                      color: '#fff',
                      fontSize: '1.25rem',
                      paddingLeft: '80px'
                    }}
                    buttonStyle={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '16px 0 0 16px',
                      width: '70px'
                    }}
                    dropdownStyle={{
                      background: '#121212',
                      color: '#fff',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                    searchStyle={{
                      background: '#1a1a1a',
                      color: '#fff',
                      borderBottom: '1px solid var(--glass-border)',
                      margin: 0,
                      width: '100%',
                      padding: '10px'
                    }}
                  />
                </div>
              </div>

              {mobileNumber.startsWith('974') && (
                <div style={{ marginTop: '24px' }} className="animate-slide-in">
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', marginBottom: '12px', letterSpacing: '1px' }}>QUICK DIGIT ENTRY (QATAR)</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
                    {[...Array(8)].map((_, i) => (
                      <input
                        key={i}
                        id={`digit-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="digit-box"
                        value={(mobileNumber.startsWith('974') ? mobileNumber.slice(3) : '')[i] || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          if (val) {
                            let currentDigits = (mobileNumber.startsWith('974') ? mobileNumber.slice(3) : '').split('');
                            currentDigits[i] = val;
                            setMobileNumber('974' + currentDigits.join('').slice(0, 8));
                            if (i < 7) document.getElementById(`digit-${i+1}`)?.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace') {
                            let currentDigits = (mobileNumber.startsWith('974') ? mobileNumber.slice(3) : '').split('');
                            if (!currentDigits[i] && i > 0) {
                              currentDigits[i-1] = '';
                              setMobileNumber('974' + currentDigits.join(''));
                              document.getElementById(`digit-${i-1}`)?.focus();
                            } else {
                              currentDigits[i] = '';
                              setMobileNumber('974' + currentDigits.join(''));
                            }
                          }
                        }}
                        style={{ 
                          width: '100%', 
                          height: '64px', 
                          fontSize: '1.5rem', 
                          fontWeight: 900, 
                          textAlign: 'center', 
                          background: 'rgba(255,255,255,0.03)', 
                          border: '1px solid var(--glass-border)', 
                          borderRadius: '12px', 
                          color: 'var(--gold-primary)',
                          outline: 'none'
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                className="btn-luxury" 
                style={{ flex: 1, height: '64px' }}
                onClick={() => setIsMobileModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-gold" 
                style={{ flex: 2, height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}
                onClick={handleSaveAndLog}
                disabled={mobileNumber.length < (mobileNumber.startsWith('974') ? 8 : 5)}
              >
                <CheckCircle2 size={20} />
                Confirm & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
