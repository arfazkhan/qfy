import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Building2, 
  ChevronLeft, 
  CheckCircle2, 
  User, 
  Save,
  ArrowRight,
  Plus,
  Trash2,
  FileText,
  Upload,
  Search,
  Scan,
  AlertOctagon,
  X
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ApiClient } from '../api/client';
import { ChevronDown } from 'lucide-react';

// Custom Luxury Dropdown Component
const LuxuryDropdown = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <label className="luxury-label">{label}</label>
      <div 
        className="input-luxury" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          cursor: 'pointer', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderColor: isOpen ? 'var(--gold-primary)' : 'var(--glass-border)',
          background: isOpen ? 'rgba(255,215,0,0.03)' : 'rgba(255,255,255,0.02)'
        }}
      >
        <span>{value || 'Select Option'}</span>
        <ChevronDown size={14} style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
          transition: 'transform 0.3s ease',
          color: isOpen ? 'var(--gold-primary)' : 'var(--text-muted)'
        }} />
      </div>

      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: 'calc(100% + 8px)', 
          left: 0, 
          right: 0, 
          background: 'rgba(20, 20, 20, 0.95)', 
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--glass-border-gold)', 
          borderRadius: '12px', 
          zIndex: 100, 
          padding: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {options.map(opt => (
            <div 
              key={opt} 
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              style={{ 
                padding: '10px 16px', 
                borderRadius: '8px', 
                fontSize: '0.8rem', 
                color: value === opt ? 'var(--gold-primary)' : '#fff',
                background: value === opt ? 'rgba(255,215,0,0.05)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontWeight: value === opt ? 800 : 500
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,215,0,0.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = value === opt ? 'rgba(255,215,0,0.05)' : 'transparent')}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Types for our grouped form
type SectionStatus = 'pending' | 'in_progress' | 'completed';
type OwnerType = 'individual' | 'corporate';

interface Owner {
  id: string;
  type: OwnerType;
  name: string;
  qid?: string;
  cr_number?: string;
  status: string;
  expiry?: string;
  nested_owner?: {
    id: string;
    name: string;
    qid: string;
    status: string;
  };
}

interface Signatory {
  id: string;
  name: string;
  qid: string;
  status: string;
  expiry?: string;
}

export const BusinessFormPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCr = searchParams.get('cr') || '';

  // 1. Basic Form State
  const [formData, setFormData] = useState({
    cr_number: initialCr,
    name: '',
    cr_expiry_date: '',
    nationality: 'Qatari',
    address: '',
    mobile: '',
    business_type: 'W.L.L',
    business_nature: 'General Trading',
    initial_note: '',
  });

  // 2. Structured Links State
  const [owners, setOwners] = useState<Owner[]>([]);
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [manager, setManager] = useState<Signatory | null>(null);

  // 3. Document State
  const [documents, setDocuments] = useState<Record<string, { file: File | null, status: 'uploaded' | 'missing', url?: string }>>({
    'Commercial License': { file: null, status: 'missing' },
    'Authorization Letter': { file: null, status: 'missing' },
    'Establishment Card': { file: null, status: 'missing' },
    'Trade License': { file: null, status: 'missing' },
    'Owner Corporate CR': { file: null, status: 'missing' }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);


  // 4. Validation Logic (Sidebar)
  const validationItems = useMemo(() => [
    { label: 'At least one individual owner', status: owners.some(o => o.type === 'individual' || o.nested_owner) ? 'valid' : 'invalid' },
    { label: 'Authorization Letter', status: documents['Authorization Letter'].status === 'uploaded' ? 'valid' : 'missing' },
    { label: 'Establishment Card', status: documents['Establishment Card'].status === 'uploaded' ? 'valid' : 'missing' },
    { label: 'Manager ID', status: manager ? 'valid' : 'missing' },
    { label: 'Manager Trade License', status: documents['Trade License'].status === 'uploaded' ? 'valid' : 'missing' }
  ], [owners, documents, manager]);

  const canSubmit = validationItems.every(item => item.status === 'valid');
  const progressPercent = Math.round((validationItems.filter(i => i.status === 'valid').length / validationItems.length) * 100);


  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);
  const [isSignatoryModalOpen, setIsSignatoryModalOpen] = useState(false);
  const [isScanningModalOpen, setIsScanningModalOpen] = useState(false);
  const [scanType, setScanType] = useState<'qid' | 'cr'>('qid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);


  const [ownerTypeStep, setOwnerTypeStep] = useState<'select' | 'form' | 'link_owner'>('select');
  const [selectedOwnerType, setSelectedOwnerType] = useState<OwnerType>('individual');
  const [corporateData, setCorporateData] = useState({ cr_number: '', name: '', expiry: '' });
  const [corporateOwner, setCorporateOwner] = useState<any>(null);

  // PRODUCTION SCANNING COMPONENT (IFRAME BRIDGE)
  const ScanIdentityModal = () => {
    return (
      <div className="modal-overlay" style={{ zIndex: 2000 }}>
        <div className="luxury-card modal-content animate-pop-in" style={{ 
          width: '900px', 
          height: '80vh', 
          padding: 0, 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--glass-border-gold)',
          boxShadow: '0 0 50px rgba(212, 175, 55, 0.2)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '20px 32px',
            background: 'rgba(255,255,255,0.02)',
            borderBottom: '1px solid var(--glass-border)'
          }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gold-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <Scan size={18} color="#000" />
                </div>
                <h2 style={{ fontSize: '1rem', fontWeight: 900, color: '#fff', letterSpacing: '1px' }}>
                  {scanType === 'qid' ? 'FORENSIC QID SCANNER' : 'DOCUMENT OCR SCANNER'}
                </h2>
             </div>
             <X className="action-icon" onClick={() => setIsScanningModalOpen(false)} />
          </div>

          <div style={{ flex: 1, background: '#000' }}>
             <iframe 
               src={`/scan?embedded=true&type=${scanType}`} 
               style={{ width: '100%', height: '100%', border: 'none' }}
               title="Hardware Scanner"
             />
          </div>
        </div>
      </div>
    );
  };

  // Listen for hardware scan completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SCAN_COMPLETE') {
        const payload = event.data.payload;
        if (!payload) return;

        // Map scanned payload to our UI state
        const resolvedStakeholder = {
          id: payload.id || uuidv4(),
          name: payload.name,
          qid: payload.qid_number,
          cr_number: payload.cr_number,
          status: payload.status || 'VALID',
          expiry: payload.expiry_date
        };

        if (isOwnerModalOpen) {
          if (selectedOwnerType === 'corporate' && ownerTypeStep === 'link_owner') {
             setCorporateOwner(resolvedStakeholder);
             addOwner({ ...corporateData, id: uuidv4() }, 'corporate');
          } else if (selectedOwnerType === 'individual') {
             addOwner(resolvedStakeholder, 'individual');
          }
        } else if (isSignatoryModalOpen) {
           addSignatory(resolvedStakeholder);
        } else if (!isOwnerModalOpen && !isSignatoryModalOpen) {
           // Assume manager search (if we add a modal for it later) or direct scan
           setManager(resolvedStakeholder);
        }

        setIsScanningModalOpen(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isOwnerModalOpen, isSignatoryModalOpen, ownerTypeStep, corporateData, selectedOwnerType]);


  const handleSearchStakeholder = async (query: string, type: 'user' | 'business') => {
    if (query.length < 3) return;
    try {
      const endpoint = type === 'user' ? `/users/search?query=${query}` : `/businesses/search/${query}`;
      const res = await ApiClient.get<any[]>(endpoint);
      setSearchResults(Array.isArray(res) ? res : [res]);
    } catch (err) {
      console.error(err);
    }
  };

  const addOwner = (item: any, type: OwnerType) => {
    const newOwner: Owner = {
      id: item.id,
      type: type,
      name: item.name,
      qid: item.qid,
      cr_number: item.cr_number,
      status: item.status || 'ACTIVE',
      expiry: item.expiry || item.cr_expiry,
      nested_owner: type === 'corporate' ? corporateOwner : undefined
    };
    if (!owners.find(o => o.id === newOwner.id)) {
      setOwners([...owners, newOwner]);
    }
    setIsOwnerModalOpen(false);
    resetOwnerModal();
  };

  const resetOwnerModal = () => {
    setOwnerTypeStep('select');
    setSearchQuery('');
    setSearchResults([]);
    setCorporateData({ cr_number: '', name: '', expiry: '' });
    setCorporateOwner(null);
  };

  const addSignatory = (user: any) => {
    const newSignatory: Signatory = {
      id: user.id,
      name: user.name,
      qid: user.qid,
      status: user.status || 'ACTIVE',
      expiry: user.expiry
    };
    if (!signatories.find(s => s.id === newSignatory.id)) {
      setSignatories([...signatories, newSignatory]);
    }
    setIsSignatoryModalOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleFileUpload = (docType: string, file: File) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: { file, status: 'uploaded', url: URL.createObjectURL(file) }
    }));
  };

  const removeOwner = (id: string) => setOwners(prev => prev.filter(o => o.id !== id));
  const removeSignatory = (id: string) => setSignatories(prev => prev.filter(s => s.id !== id));

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!isDraft && !canSubmit) {
      setError('Please complete all required fields and documents.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Upsert Business
      const payload = {
        ...formData,
        owners: owners.map(o => ({ 
          id: o.id, 
          type: o.type, 
          name: o.name, 
          cr_number: o.cr_number,
          nested_owner_id: o.type === 'corporate' ? o.nested_owner?.id : undefined
        })),
        authorized_signatories: signatories.map(s => s.id),
        manager_id: manager?.id || null
      };

      const business = await ApiClient.post<any>('/businesses/upsert', payload);

      // 2. Upload Documents
      const uploadPromises = Object.entries(documents)
        .filter(([_, data]) => data.file)
        .map(([type, data]) => {
          const docFormData = new FormData();
          docFormData.append('document_type', type);
          docFormData.append('file', data.file!);
          docFormData.append('is_available', 'true');
          return ApiClient.post(`/businesses/${business.cr_number}/documents`, docFormData);
        });

      await Promise.all(uploadPromises);

      setSuccess(true);
      setTimeout(() => navigate(`/business/${business.cr_number}`), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to process registration.');
    } finally {
      setLoading(false);
    }
  };

  // UI Components (Sub-sections)
  const SectionHeader = ({ id, title, description, status }: { id: string, title: string, description: string, status: SectionStatus }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          width: '32px', height: '32px', borderRadius: '8px', background: 'var(--gold-primary)', 
          color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.9rem'
        }}>{id}</div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>{title}</h2>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{description}</p>
        </div>
      </div>
      <div style={{ 
        padding: '6px 12px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, 
        background: status === 'completed' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.03)',
        color: status === 'completed' ? '#10b981' : 'var(--text-muted)',
        border: '1px solid ' + (status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : 'var(--glass-border)')
      }}>
        {status.toUpperCase().replace('_', ' ')}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0 20px' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', padding: 0, marginBottom: '12px' }}>
            <ChevronLeft size={16} /> BACK TO BUSINESSES
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ width: '48px', height: '48px', background: 'rgba(255,215,0,0.05)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border-gold)' }}>
                <Building2 size={24} color="var(--gold-primary)" />
             </div>
             <div>
                <h1 style={{ fontSize: '2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>Register Business</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Add all required details to create the business profile</p>
             </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn-luxury" onClick={() => handleSubmit(true)} style={{ height: '48px', padding: '0 24px', fontSize: '0.8rem' }}>
            <Save size={16} /> SAVE AS DRAFT
          </button>
          <button className="btn-luxury" style={{ height: '48px', padding: '0 24px', fontSize: '0.8rem' }}>
             CLEAR ALL
          </button>
          <button 
            className="btn-gold" 
            disabled={!canSubmit || loading}
            onClick={() => handleSubmit(false)}
            style={{ height: '48px', padding: '0 32px', fontSize: '0.85rem', fontWeight: 800 }}
          >
            REVIEW & SUBMIT <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
        {/* Main Form Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {error && (
            <div className="animate-pop-in" style={{ padding: '16px 24px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
              <AlertOctagon size={18} /> {error}
            </div>
          )}

          {success && (
            <div className="animate-pop-in" style={{ padding: '16px 24px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle2 size={18} /> Registration submitted successfully! Redirecting...
            </div>
          )}

          
          {/* SECTION 1: COMMERCIAL LICENSE */}
          <div className="luxury-card animate-scale-up" style={{ padding: '32px' }}>
            <SectionHeader id="1" title="Commercial License" description="Business identity & ownership" status={(owners.length > 0 && formData.address) ? 'completed' : 'in_progress'} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '40px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '4px' }}>BUSINESS DETAILS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label className="luxury-label">CR NUMBER</label>
                    <input name="cr_number" value={formData.cr_number} onChange={handleInputChange} className="input-luxury" />
                  </div>
                  <div>
                    <label className="luxury-label">BUSINESS NAME</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} className="input-luxury" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <label className="luxury-label">CR EXPIRY DATE</label>
                    <input type="date" name="cr_expiry_date" value={formData.cr_expiry_date} onChange={handleInputChange} className="input-luxury" style={{ colorScheme: 'dark' }} />
                  </div>
                   <LuxuryDropdown 
                     label="BUSINESS TYPE" 
                     value={formData.business_type} 
                     options={['W.L.L', 'LLC', 'Individual Establishment', 'Foreign Branch', 'Representative Office']} 
                     onChange={(val) => setFormData(prev => ({ ...prev, business_type: val }))} 
                   />

                </div>
                <div>
                  <label className="luxury-label">ADDRESS</label>
                  <input name="address" value={formData.address} onChange={handleInputChange} className="input-luxury" placeholder="Street, Zone, Building..." />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                   <LuxuryDropdown 
                     label="BUSINESS NATURE" 
                     value={formData.business_nature} 
                     options={['General Trading', 'Gold & Jewelry', 'Real Estate', 'Consultancy', 'Construction', 'Technology']} 
                     onChange={(val) => setFormData(prev => ({ ...prev, business_nature: val }))} 
                   />
                   <LuxuryDropdown 
                     label="NATIONALITY" 
                     value={formData.nationality} 
                     options={['Qatari', 'Omani', 'Kuwaiti', 'Saudi', 'Emirati', 'Bahraini', 'Other (Expats)']} 
                     onChange={(val) => setFormData(prev => ({ ...prev, nationality: val }))} 
                   />
                </div>

                 <div className="doc-upload-full" style={{ 
                   padding: '20px', 
                   background: documents['Commercial License'].status === 'uploaded' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.01)', 
                   border: '1px dashed ' + (documents['Commercial License'].status === 'uploaded' ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)'), 
                   borderRadius: '16px' 
                 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                       {documents['Commercial License'].status === 'uploaded' ? <CheckCircle2 size={24} color="#10b981" /> : <FileText size={24} color="var(--gold-primary)" />}
                       <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff' }}>
                            {documents['Commercial License'].file ? documents['Commercial License'].file.name : 'Upload Commercial Registration (CR)'}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PDF or Image required for validation</div>
                       </div>
                       <input 
                         type="file" 
                         id="file-commercial-license" 
                         hidden 
                         onChange={(e) => e.target.files?.[0] && handleFileUpload('Commercial License', e.target.files[0])} 
                       />
                       <button 
                         className="btn-luxury" 
                         type="button"
                         onClick={() => document.getElementById('file-commercial-license')?.click()}
                         style={{ padding: '8px 16px', fontSize: '0.7rem' }}
                       >
                         {documents['Commercial License'].status === 'uploaded' ? 'CHANGE FILE' : 'UPLOAD'}
                       </button>
                    </div>
                 </div>
              </div>

              {/* Owners List */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>OWNERS</h3>
                  <button className="btn-luxury" onClick={() => setIsOwnerModalOpen(true)} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>
                    <Plus size={14} /> ADD OWNER
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {owners.length === 0 ? (
                    <div style={{ padding: '40px', border: '1px dashed var(--glass-border)', borderRadius: '16px', textAlign: 'center' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No owners added yet</p>
                    </div>
                  ) : (
                    owners.map(owner => (
                      <div key={owner.id} className="stakeholder-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar-mini">{owner.name[0]}</div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{owner.name}</div>
                              {owner.type === 'corporate' && <div style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'rgba(255,215,0,0.1)', color: 'var(--gold-primary)', borderRadius: '4px', fontWeight: 800 }}>CORP</div>}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{owner.type === 'individual' ? 'QID: ' + owner.qid : 'CR: ' + owner.cr_number}</div>
                            {owner.nested_owner && (
                              <div style={{ fontSize: '0.65rem', color: 'var(--gold-primary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <User size={10} /> Rep: {owner.nested_owner.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <Trash2 size={16} className="action-icon" onClick={() => removeOwner(owner.id)} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: AUTHORIZED SIGNATORIES */}
          <div className="luxury-card animate-scale-up" style={{ padding: '32px' }}>
            <SectionHeader id="2" title="Authorized Signatories" description="People authorized to act on behalf of the business" status={signatories.length > 0 ? 'completed' : 'pending'} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>AUTHORIZED PERSONS</h3>
                  <button className="btn-luxury" onClick={() => setIsSignatoryModalOpen(true)} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>
                    <Plus size={14} /> ADD PERSON
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {signatories.map(s => (
                    <div key={s.id} className="stakeholder-item">
                       <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar-mini" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{s.name[0]}</div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{s.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>QID: {s.qid}</div>
                          </div>
                        </div>
                        <Trash2 size={16} className="action-icon" onClick={() => removeSignatory(s.id)} />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '20px' }}>REQUIRED DOCUMENTS</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {['Authorization Letter', 'Establishment Card'].map(doc => (
                    <div key={doc} className="doc-upload-box" style={{ 
                      borderColor: documents[doc].status === 'uploaded' ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)',
                      background: documents[doc].status === 'uploaded' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)'
                    }}>
                      <div className="doc-icon-container">
                        {documents[doc].status === 'uploaded' ? <CheckCircle2 size={24} color="#10b981" /> : <FileText size={24} color="var(--gold-primary)" />}
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{doc}</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        {documents[doc].file ? documents[doc].file?.name : 'Upload PDF/JPG (max 10MB)'}
                      </span>
                      <input 
                        type="file" 
                        id={`file-${doc}`} 
                        hidden 
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(doc, e.target.files[0])} 
                      />
                      <button 
                        className="btn-luxury" 
                        type="button"
                        onClick={() => document.getElementById(`file-${doc}`)?.click()}
                        style={{ marginTop: '12px', width: '100%', fontSize: '0.7rem' }}
                      >
                        <Upload size={14} /> {documents[doc].status === 'uploaded' ? 'CHANGE FILE' : 'UPLOAD'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: TRADE LICENSE */}
          <div className="luxury-card animate-scale-up" style={{ padding: '32px' }}>
            <SectionHeader id="3" title="Trade License" description="Operational manager & license" status={manager ? 'completed' : 'pending'} />
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '40px' }}>
               <div>
                  <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '20px' }}>MANAGER INCHARGE</h3>
                  {!manager ? (
                    <div className="search-input-container">
                      <Search size={18} className="search-icon" />
                      <input className="input-luxury" placeholder="Search or scan Manager QID..." style={{ paddingLeft: '44px' }} />
                      <div 
                        className="scan-trigger-btn"
                        onClick={() => {
                          setScanType('qid');
                          setIsScanningModalOpen(true);
                        }}
                      >
                        <Scan size={16} />
                        <span>SCAN ID</span>
                      </div>
                    </div>
                  ) : (
                    <div className="stakeholder-item active">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div className="avatar-large">{manager.name[0]}</div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff' }}>{manager.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QID: {manager.qid}</div>
                          </div>
                        </div>
                        <X size={18} className="action-icon" onClick={() => setManager(null)} />
                    </div>
                  )}
               </div>
               
                <div>
                  <h3 style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '20px' }}>TRADE LICENSE DOCUMENT</h3>
                  <div className="doc-upload-box" style={{ 
                    maxWidth: '100%',
                    borderColor: documents['Trade License'].status === 'uploaded' ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)',
                    background: documents['Trade License'].status === 'uploaded' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)'
                  }}>
                    <div className="doc-icon-container">
                      {documents['Trade License'].status === 'uploaded' ? <CheckCircle2 size={24} color="#10b981" /> : <FileText size={24} color="var(--gold-primary)" />}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>Trade License Document</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {documents['Trade License'].file ? documents['Trade License'].file?.name : 'Upload high-resolution PDF or JPG (max 10MB)'}
                    </span>
                    <input 
                      type="file" 
                      id="file-trade-license" 
                      hidden 
                      onChange={(e) => e.target.files?.[0] && handleFileUpload('Trade License', e.target.files[0])} 
                    />
                    <button 
                      className="btn-luxury" 
                      type="button"
                      onClick={() => document.getElementById('file-trade-license')?.click()}
                      style={{ marginTop: '16px', padding: '12px 32px', width: 'auto', fontSize: '0.75rem' }}
                    >
                      <Upload size={16} /> {documents['Trade License'].status === 'uploaded' ? 'CHANGE DOCUMENT' : 'UPLOAD DOCUMENT'}
                    </button>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', position: 'sticky', top: '32px' }}>
          
          {/* Progress Bar Component */}
          <div className="luxury-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
               <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>COMPLIANCE PROGRESS</span>
               <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--gold-primary)' }}>{progressPercent}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
               <div style={{ 
                 width: `${progressPercent}%`, 
                 height: '100%', 
                 background: 'var(--gold-primary)', 
                 boxShadow: '0 0 20px var(--gold-primary)', 
                 transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
               }}></div>
            </div>
          </div>

          {/* Registration Summary */}
          <div className="luxury-card" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: '20px' }}>Registration Summary</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ 
                    width: '18px', height: '18px', borderRadius: '50%', 
                    border: '2px solid ' + (formData.name && formData.cr_number ? '#10b981' : 'var(--glass-border)'), 
                    display: 'flex', alignItems: 'center', justifyContent: 'center' 
                  }}>
                    {(formData.name && formData.cr_number) && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Commercial License</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: (formData.name && formData.cr_number) ? '#10b981' : 'var(--text-muted)' }}>
                  {(formData.name && formData.cr_number) ? 'Complete' : 'Pending'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {owners.length > 0 ? <CheckCircle2 size={18} color="#10b981" /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--glass-border)' }} />}
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Owners</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{owners.length} added</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {signatories.length > 0 ? <CheckCircle2 size={18} color="#10b981" /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--glass-border)' }} />}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Authorized Signatories</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{signatories.length > 0 ? 'Complete' : 'Pending'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {manager ? <CheckCircle2 size={18} color="#10b981" /> : <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--glass-border)' }} />}
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Trade License</span>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)' }}>{manager ? 'Complete' : 'Pending'}</span>
              </div>
            </div>
          </div>

          {/* Validation Panel */}
          <div className="luxury-card" style={{ padding: '24px' }}>
             <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: '20px' }}>Required to Submit</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {validationItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>{item.label}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.status === 'valid' ? 'Verified' : 'Not uploaded/linked'}</div>
                    </div>
                    {item.status === 'valid' ? (
                       <CheckCircle2 size={16} color="#10b981" />
                    ) : (
                       <AlertOctagon size={16} color="#ef4444" />
                    )}
                  </div>
                ))}
             </div>
          </div>


        </div>
      </div>

      {/* REFINED OWNER MODAL WIZARD */}
      {isOwnerModalOpen && (
        <div className="modal-overlay">
          <div className="luxury-card modal-content animate-pop-in" style={{ width: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>Add Owner</h2>
              <X className="action-icon" onClick={() => { setIsOwnerModalOpen(false); resetOwnerModal(); }} />
            </div>

            {ownerTypeStep === 'select' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                 <div className="quick-action-card" onClick={() => { setSelectedOwnerType('individual'); setOwnerTypeStep('link_owner'); }}>
                    <div className="quick-action-icon"><User size={24} /></div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Individual</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Search QID or Scan ID</div>
                 </div>
                 <div className="quick-action-card" onClick={() => { setSelectedOwnerType('corporate'); setOwnerTypeStep('form'); }}>
                    <div className="quick-action-icon"><Building2 size={24} /></div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>Corporate</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Company Registration</div>
                 </div>
              </div>
            )}

            {ownerTypeStep === 'form' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                       <label className="luxury-label">CR NUMBER</label>
                       <input className="input-luxury" placeholder="CR Number..." value={corporateData.cr_number} onChange={(e) => setCorporateData({...corporateData, cr_number: e.target.value})} />
                    </div>
                    <div>
                       <label className="luxury-label">CR EXPIRY</label>
                       <input type="date" className="input-luxury" style={{ colorScheme: 'dark' }} value={corporateData.expiry} onChange={(e) => setCorporateData({...corporateData, expiry: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label className="luxury-label">COMPANY NAME</label>
                    <input className="input-luxury" placeholder="Company Name..." value={corporateData.name} onChange={(e) => setCorporateData({...corporateData, name: e.target.value})} />
                 </div>
                  <div className="doc-upload-full" style={{ 
                    padding: '20px',
                    borderColor: documents['Owner Corporate CR']?.status === 'uploaded' ? 'rgba(16, 185, 129, 0.3)' : 'var(--glass-border)',
                    background: documents['Owner Corporate CR']?.status === 'uploaded' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)'
                  }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                        {documents['Owner Corporate CR']?.status === 'uploaded' ? <CheckCircle2 size={20} color="#10b981" /> : <Upload size={20} color="var(--gold-primary)" />}
                        <div style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                          {documents['Owner Corporate CR']?.file ? documents['Owner Corporate CR']?.file?.name : 'Upload Company CR'}
                        </div>
                        <input 
                          type="file" 
                          id="file-corporate-cr" 
                          hidden 
                          onChange={(e) => e.target.files?.[0] && handleFileUpload('Owner Corporate CR', e.target.files[0])} 
                        />
                        <button 
                          className="btn-luxury" 
                          type="button"
                          onClick={() => document.getElementById('file-corporate-cr')?.click()}
                          style={{ padding: '6px 12px', fontSize: '0.7rem' }}
                        >
                          {documents['Owner Corporate CR']?.status === 'uploaded' ? 'CHANGE' : 'UPLOAD'}
                        </button>
                     </div>
                  </div>
                 <button className="btn-gold" onClick={() => setOwnerTypeStep('link_owner')} style={{ height: '50px', fontSize: '0.85rem' }}>
                    NEXT: LINK REPRESENTATIVE OWNER <ArrowRight size={18} />
                 </button>
              </div>
            )}

            {ownerTypeStep === 'link_owner' && (
              <div>
                <button onClick={() => setOwnerTypeStep(selectedOwnerType === 'individual' ? 'select' : 'form')} style={{ background: 'transparent', border: 'none', color: 'var(--gold-primary)', fontSize: '0.75rem', fontWeight: 800, marginBottom: '16px', cursor: 'pointer', padding: 0 }}>
                  <ChevronLeft size={14} style={{ marginBottom: '-2px' }} /> BACK
                </button>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>{selectedOwnerType === 'individual' ? 'Search or scan the individual identity:' : 'Link the individual owner for this corporate entity:'}</p>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                  <div className="search-input-container" style={{ flex: 1 }}>
                    <Search size={18} className="search-icon" />
                    <input 
                      className="input-luxury" 
                      placeholder="Search by Name or QID..." 
                      style={{ paddingLeft: '44px' }}
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        handleSearchStakeholder(e.target.value, 'user');
                      }}
                    />
                    <div 
                      className="scan-trigger-btn"
                      onClick={() => {
                        setScanType('qid');
                        setIsScanningModalOpen(true);
                      }}
                    >
                      <Scan size={16} />
                      <span>SCAN ID</span>
                    </div>
                  </div>
                </div>

                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                   {searchResults.map((item: any) => (
                     <div key={item.id} className="search-result-item" onClick={() => {
                        if (selectedOwnerType === 'corporate') {
                          setCorporateOwner(item);
                          addOwner({ ...corporateData, id: uuidv4() }, 'corporate');
                        } else {
                          addOwner(item, 'individual');
                        }
                     }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <div className="avatar-mini" style={{ width: '32px', height: '32px' }}>{item.name[0]}</div>
                           <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{item.name}</div>
                        </div>
                        <Plus size={16} color="var(--gold-primary)" />
                     </div>
                   ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isSignatoryModalOpen && (
        <div className="modal-overlay">
          <div className="luxury-card modal-content animate-pop-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>Add Authorized Person</h2>
              <X className="action-icon" onClick={() => setIsSignatoryModalOpen(false)} />
            </div>
            
            <div className="search-input-container">
              <Search size={18} className="search-icon" />
              <input 
                className="input-luxury" 
                placeholder="Search by Name or QID..." 
                style={{ paddingLeft: '44px' }}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchStakeholder(e.target.value, 'user');
                }}
              />
              <div 
                className="scan-trigger-btn"
                onClick={() => {
                  setScanType('qid');
                  setIsScanningModalOpen(true);
                }}
              >
                <Scan size={16} />
                <span>SCAN ID</span>
              </div>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {searchResults.map((user: any) => (
                <div key={user.id} className="search-result-item" onClick={() => addSignatory(user)}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="avatar-mini" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>{user.name[0]}</div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{user.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>QID: {user.qid}</div>
                      </div>
                    </div>
                    <Plus size={16} color="#10b981" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          width: 500px;
          padding: 32px;
          border: 1px solid var(--glass-border-gold);
        }
        .search-result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .search-result-item:hover {
          background: rgba(255,255,255,0.08);
          border-color: var(--glass-border-gold);
          transform: translateY(-2px);
        }
        .stakeholder-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          transition: all 0.3s ease;
        }
        .stakeholder-item.active {
          background: rgba(255,215,0,0.03);
          border-color: var(--glass-border-gold);
        }
        .avatar-mini {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          color: var(--gold-primary);
          border: 1px solid var(--glass-border);
        }
        .avatar-large {
           width: 48px;
           height: 48px;
           border-radius: 14px;
           background: var(--gold-primary);
           color: #000;
           display: flex;
           align-items: center;
           justify-content: center;
           font-weight: 900;
           font-size: 1.2rem;
        }
        .action-icon {
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s;
        }
        .action-icon:hover {
          color: #ef4444;
        }
        .doc-upload-box {
          padding: 24px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          transition: all 0.3s ease;
        }
        .doc-upload-box:hover {
           background: rgba(255,255,255,0.04);
           border-color: rgba(255,215,0,0.2);
        }
        .doc-icon-container {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          background: rgba(255,215,0,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }
        .doc-upload-full {
           padding: 40px;
           background: rgba(255,255,255,0.01);
           border: 2px dashed var(--glass-border);
           border-radius: 24px;
           display: flex;
           align-items: center;
           justify-content: center;
        }
        .search-input-container {
           position: relative;
           display: flex;
           align-items: center;
        }
        .search-icon {
           position: absolute;
           left: 16px;
           color: var(--text-muted);
        }
        .scan-trigger-btn {
           position: absolute;
           right: 8px;
           background: rgba(255, 215, 0, 0.1);
           color: var(--gold-primary);
           border: 1px solid rgba(255, 215, 0, 0.2);
           border-radius: 8px;
           padding: 6px 12px;
           display: flex;
           align-items: center;
           gap: 8px;
           font-size: 0.65rem;
           font-weight: 800;
           letter-spacing: 0.5px;
           cursor: pointer;
           transition: all 0.2s;
        }
        .scan-trigger-btn:hover {
           background: var(--gold-primary);
           color: #000;
           transform: translateY(-1px);
        }
        .scan-icon {
           position: absolute;
           right: 16px;
           color: var(--gold-primary);
           cursor: pointer;
        }
        .quick-action-card {
           display: flex;
           align-items: center;
           gap: 16px;
           padding: 20px;
           background: var(--glass-bg);
           border: 1px solid var(--glass-border);
           border-radius: 20px;
           cursor: pointer;
           transition: all 0.3s ease;
        }
        .quick-action-card:hover {
           transform: translateX(4px);
           background: rgba(255,255,255,0.05);
           border-color: var(--glass-border-gold);
        }
        .quick-action-icon {
           width: 44px;
           height: 44px;
           border-radius: 12px;
           background: rgba(255,255,255,0.03);
           display: flex;
           align-items: center;
           justify-content: center;
           color: var(--gold-primary);
        }
      `}</style>
      {/* SCAN MODAL */}
      {isScanningModalOpen && <ScanIdentityModal />}
    </div>
  );
};
