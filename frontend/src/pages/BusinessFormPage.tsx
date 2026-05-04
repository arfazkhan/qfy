import React, { useState } from 'react';
import { 
  Building2, 
  ChevronLeft, 
  ShieldCheck, 
  CheckCircle2, 
  User, 
  FileText,
  Calendar,
  AlertCircle,
  Save,
  ArrowRight,
  History
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiClient } from '../api/client';
import { IdentityPicker } from '../components/IdentityPicker';

export const BusinessFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCr = searchParams.get('cr') || '';

  const [formData, setFormData] = useState({
    cr_number: initialCr,
    name: '',
    cr_expiry_date: '',
    owner_id: null as string | null,
    authorized_person_id: null as string | null,
    initial_note: '',
  });

  const [linkedOwner, setLinkedOwner] = useState<any>(null);
  const [linkedAuthorized, setLinkedAuthorized] = useState<any>(null);

  const [documents, setDocuments] = useState([
    { type: 'Commercial License', required: true, uploaded: false },
    { type: 'Authorization Letter', required: true, uploaded: false },
    { type: 'Authorized Signatures', required: true, uploaded: false },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle return from ScanPage
  React.useEffect(() => {
    const linkedId = searchParams.get('linked_id');
    const role = searchParams.get('role');
    
    if (linkedId) {
      if (role === 'authorized') {
        handleAuthorizedLink(linkedId);
      } else {
        handleOwnerLink(linkedId);
      }
      
      // Clean up search params to avoid re-linking on refresh
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('linked_id');
      newParams.delete('role');
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [searchParams]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOwnerLink = async (userId: string) => {
    try {
      // Fetch full user details to show in picker
      const user = await ApiClient.get<any>(`/users/${userId}`);
      setLinkedOwner(user);
      setFormData(prev => ({ ...prev, owner_id: userId }));
    } catch (err) {
      setError('Failed to link owner');
    }
  };

  const handleAuthorizedLink = async (userId: string) => {
    try {
      const user = await ApiClient.get<any>(`/users/${userId}`);
      setLinkedAuthorized(user);
      setFormData(prev => ({ ...prev, authorized_person_id: userId }));
    } catch (err) {
      setError('Failed to link authorized person');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cr_number || !formData.name || !formData.cr_expiry_date) {
      setError('Please fill in all basic business information.');
      return;
    }

    if (!formData.owner_id) {
      setError('An Owner ID must be linked to register the business.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Upsert Business
      const business = await ApiClient.post<any>('/businesses/upsert', {
        cr_number: formData.cr_number,
        name: formData.name,
        cr_expiry_date: formData.cr_expiry_date,
        owner_id: formData.owner_id,
        authorized_person_id: formData.authorized_person_id
      });

      // 2. Create documents (placeholders for MVP)
      for (const doc of documents) {
        await ApiClient.post(`/businesses/${business.cr_number}/documents`, {
          type: doc.type,
          is_available: doc.uploaded,
          expiry_date: null
        });
      }

      setSuccess(true);
      setTimeout(() => navigate(`/business/${business.cr_number}`), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save business. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {success && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
            border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '24px', animation: 'scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <CheckCircle2 size={50} color="#10b981" />
          </div>
          <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '2px', marginBottom: '8px' }}>BUSINESS REGISTERED</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Company compliance record created successfully</p>
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <button 
            onClick={() => navigate(-1)} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', 
              border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, 
              letterSpacing: '1px', cursor: 'pointer', marginBottom: '12px', padding: 0
            }}
          >
            <ChevronLeft size={14} />
            BACK
          </button>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>REGISTER BUSINESS</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '0.9rem' }}>Initialize compliance record and link identities</p>
        </div>
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', 
          padding: '12px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <ShieldCheck size={20} color="var(--gold-primary)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>COMPLIANCE ENGINE ACTIVE</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Left Column: Basic Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="luxury-card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '24px' }}>BASIC INFORMATION</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="luxury-label">COMMERCIAL REGISTRATION (CR)</label>
                <div style={{ position: 'relative' }}>
                  <Building2 size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    name="cr_number"
                    value={formData.cr_number}
                    onChange={handleInputChange}
                    className="input-luxury" 
                    placeholder="Enter CR Number..." 
                    style={{ paddingLeft: '48px' }}
                  />
                </div>
              </div>

              <div>
                <label className="luxury-label">BUSINESS NAME (AS PER CR)</label>
                <input 
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input-luxury" 
                  placeholder="Official business name..." 
                />
              </div>

              <div>
                <label className="luxury-label">CR EXPIRY DATE</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input 
                    type="date"
                    name="cr_expiry_date"
                    value={formData.cr_expiry_date}
                    onChange={handleInputChange}
                    className="input-luxury" 
                    style={{ paddingLeft: '48px', colorScheme: 'dark' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="luxury-card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px', marginBottom: '24px' }}>DOCUMENT CHECKLIST (MVP)</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Mark documents currently in possession</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {documents.map((doc, i) => (
                <div 
                  key={i} 
                  onClick={() => {
                    const newDocs = [...documents];
                    newDocs[i].uploaded = !newDocs[i].uploaded;
                    setDocuments(newDocs);
                  }}
                  style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px',
                    border: `1px solid ${doc.uploaded ? 'var(--gold-muted)' : 'var(--glass-border)'}`,
                    cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FileText size={18} color={doc.uploaded ? 'var(--gold-primary)' : 'var(--text-muted)'} />
                    <span style={{ fontSize: '0.85rem', color: doc.uploaded ? '#fff' : 'rgba(255,255,255,0.6)' }}>{doc.type}</span>
                  </div>
                  {doc.uploaded ? <CheckCircle2 size={18} color="var(--gold-primary)" /> : <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--glass-border)' }} />}
                </div>
              ))}
            </div>
          </div>

          <div className="luxury-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <History size={18} color="var(--gold-primary)" />
              <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>INITIAL OPERATIONAL NOTE</h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Capture Day-1 context or document promises</p>
            
            <textarea 
              name="initial_note"
              value={formData.initial_note}
              onChange={(e) => setFormData(prev => ({ ...prev, initial_note: e.target.value }))}
              className="input-luxury" 
              placeholder="e.g., Customer promised to bring original CR tomorrow..." 
              style={{ height: '120px', resize: 'none', padding: '16px', fontSize: '0.9rem' }}
            />
          </div>
        </div>

        {/* Right Column: Identity Linking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="luxury-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <User size={18} color="var(--gold-primary)" />
              <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>OWNER IDENTITY</h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Source of Truth: QID Record</p>
            
            <IdentityPicker 
              label="Search or Scan Owner QID"
              onLink={handleOwnerLink}
              onUnlink={() => { setLinkedOwner(null); setFormData(prev => ({ ...prev, owner_id: null })); }}
              linkedUser={linkedOwner}
              role="owner"
            />
          </div>

          <div className="form-section luxury-card" style={{ padding: '32px' }}>
            <div className="section-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <User size={20} color="var(--gold-primary)" />
              <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>AUTHORIZED PERSON</h2>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '24px' }}>Optional identity link for operational authority</p>
            
            <IdentityPicker 
              label="Search or Scan Authorized QID"
              onLink={handleAuthorizedLink}
              onUnlink={() => { setLinkedAuthorized(null); setFormData(prev => ({ ...prev, authorized_person_id: null })); }}
              linkedUser={linkedAuthorized}
              role="authorized"
            />
          </div>

          {/* Action Footer */}
          <div style={{ marginTop: 'auto' }}>
            {error && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', color: '#ef4444', 
                background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '12px', marginBottom: '20px',
                border: '1px solid rgba(239, 68, 68, 0.1)'
              }}>
                <AlertCircle size={18} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--success)', 
                background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: '12px', marginBottom: '20px',
                border: '1px solid rgba(16, 185, 129, 0.1)'
              }}>
                <CheckCircle2 size={18} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Business Registered Successfully! Redirecting...</span>
              </div>
            )}

            <button 
              type="submit"
              disabled={loading || success}
              className="btn-gold" 
              style={{ width: '100%', height: '64px', fontSize: '1.1rem', gap: '12px' }}
            >
              {loading ? (
                <div className="spinner-gold" style={{ width: '24px', height: '24px' }} />
              ) : (
                <>
                  <Save size={20} />
                  COMPLETE REGISTRATION
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .luxury-card {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
          position: relative;
          overflow: hidden;
        }
        .luxury-label {
          display: block;
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--gold-primary);
          margin-bottom: 8px;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
};

