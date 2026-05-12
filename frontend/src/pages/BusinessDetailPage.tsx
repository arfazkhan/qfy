import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  ShieldCheck,
  User,
  AlertCircle,
  AlertOctagon,
  History,
  MoreVertical,
  Trash2,
  MapPin,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Edit3,
  Eye,
  Download,
  ArrowRight,
  Plus,
  Calendar,
  RotateCcw,
  ExternalLink,
  Search,
  Scan,
  Link2Off,
  UserMinus
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiClient } from '../api/client';
import { DocumentUploadRow } from '../components/DocumentUploadRow';

export const BusinessDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: cr_number } = useParams<{ id: string }>();

  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);
  const [showEditExpiryModal, setShowEditExpiryModal] = useState(false);
  const [showDeleteNoteModal, setShowDeleteNoteModal] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [updatingExpiry, setUpdatingExpiry] = useState(false);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [activeDocType, setActiveDocType] = useState<string | null>(null);
  const [unlinkConfig, setUnlinkConfig] = useState<{ id: string, name: string, isCorporate: boolean } | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [peopleList, setPeopleList] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [showAddWorkflow, setShowAddWorkflow] = useState(false);
  const [workflowStep, setWorkflowStep] = useState(1); // 1: Role, 2: Owner Type
  const [selectedRole, setSelectedRole] = useState<string>('STAFF');
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [companyForm, setCompanyForm] = useState<{name: string, cr_number: string, expiry_date: string, file: File | null, existingFileUrl?: string}>({ name: '', cr_number: '', expiry_date: '', file: null });
  const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [scanEmployer, setScanEmployer] = useState<string | null>(null);

  const peopleSectionRef = React.useRef<HTMLDivElement>(null);
  const docsSectionRef = React.useRef<HTMLDivElement>(null);

  const scrollToSection = (target: 'people' | 'docs') => {
    const ref = target === 'people' ? peopleSectionRef : docsSectionRef;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const handleScanMessage = (event: MessageEvent) => {
      if (event.data?.type === 'scan-success' || event.data?.type === 'scan-complete' || event.data === 'scan-complete') {
        setShowScanModal(false);
        fetchBusiness();
      }
    };
    window.addEventListener('message', handleScanMessage);
    return () => window.removeEventListener('message', handleScanMessage);
  }, []);

  const fetchBusiness = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.get<any>(`/businesses/${cr_number}`);
      setBusiness(data);
      setPeopleList(data.members || []);
      setActivities(data.activities || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, [cr_number]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SCAN_COMPLETE') {
        setShowScanModal(false);
        fetchBusiness();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Computed metrics
  const metrics = useMemo(() => {
    if (!business) return null;
    const today = new Date();
    const docs = business.documents || [];

    // Required docs list
    const requiredTypes = ["Authorization Letter", "Commercial License", "Establishment Card", "Authorized Signatures", "Manager Trade License"];

    const validDocs = docs.filter((d: any) =>
      requiredTypes.some(t => d.document_type.includes(t)) &&
      d.is_available &&
      (!d.expiry_date || new Date(d.expiry_date) >= today)
    ).length;

    let expiringCount = 0;
    const sixtyDays = 60 * 24 * 60 * 60 * 1000;

    // Check People (Fixed roles + all members)
    const allMembers = business.members || [];

    // Check CR Expiry
    if (business.cr_expiry_date) {
      const diff = new Date(business.cr_expiry_date).getTime() - today.getTime();
      if (diff > 0 && diff < sixtyDays) expiringCount++;
    }

    allMembers.forEach((m: any) => {
      if (m.expiry_date) {
        const diff = new Date(m.expiry_date).getTime() - today.getTime();
        if (diff > 0 && diff < sixtyDays) expiringCount++;
      }
    });

    // Check Docs
    docs.forEach((d: any) => {
      if (d.expiry_date) {
        const diff = new Date(d.expiry_date).getTime() - today.getTime();
        if (diff > 0 && diff < sixtyDays) expiringCount++;
      }
    });

    const crDiff = business.cr_expiry_date ? Math.ceil((new Date(business.cr_expiry_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return {
      validDocs,
      totalDocs: requiredTypes.length,
      expiringSoon: expiringCount,
      expiredItems: business.compliance_reasons?.length || 0,
      daysToCr: crDiff
    };
  }, [business]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await ApiClient.post(`/businesses/${cr_number}/notes`, { content: newNote });
      setNewNote('');
      fetchBusiness();
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    setNoteToDelete(noteId);
    setShowDeleteNoteModal(true);
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    try {
      await ApiClient.delete(`/businesses/${cr_number}/notes/${noteToDelete}`);
      fetchBusiness();
      setShowDeleteNoteModal(false);
      setNoteToDelete(null);
    } catch (err) {
      console.error('Failed to delete note', err);
      alert('Failed to delete note');
    }
  };

  const handleProfileUpdate = async () => {
    try {
      await ApiClient.put(`/businesses/${cr_number}`, editForm);
      setShowEditModal(false);
      fetchBusiness();
    } catch (err) {
      console.error('Failed to update profile', err);
      alert('Failed to update profile');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return '#10b981';
      case 'WARNING': return '#3b82f6';
      case 'PARTIAL': return '#f59e0b'; // Orange for Grace Period
      case 'NON_COMPLIANT': return '#ef4444';
      case 'INVALID': return '#7f1d1d';
      default: return 'var(--text-muted)';
    }
  };

  const handleLogVisit = async () => {
    try {
      await ApiClient.post(`/businesses/${cr_number}/log-visit`);
      fetchBusiness();
    } catch (err: any) {
      setError('Failed to log visit');
    }
  };

  const handleDeleteRecord = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete ${business.name}? This action cannot be undone.`)) return;

    try {
      await ApiClient.delete(`/businesses/${cr_number}`);
      navigate('/businesses');
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete business record');
    }
  };

  const handleExpiryUpdate = async () => {
    if (!activeDocType || !editExpiryDate) return;
    setUpdatingExpiry(true);
    try {
      const formData = new FormData();
      formData.append('document_type', activeDocType);
      formData.append('expiry_date', editExpiryDate);
      formData.append('is_available', 'true');

      await ApiClient.post(`/businesses/${cr_number}/documents`, formData);
      setShowEditExpiryModal(false);
      fetchBusiness();
    } catch (err: any) {
      setError('Failed to update expiry date');
    } finally {
      setUpdatingExpiry(false);
    }
  };

  // handleSetRepresentative removed

  const handleUnlink = async (targetId: string, targetName: string, isCompany = false) => {
    setUnlinkConfig({ id: targetId, name: targetName, isCorporate: isCompany });
  };

  const confirmUnlink = async () => {
    if (!unlinkConfig) return;
    try {
      await ApiClient.delete(`/businesses/${cr_number}/members/${unlinkConfig.id}`);
      await fetchBusiness();
      setUnlinkConfig(null);
    } catch (e) {
      alert('Failed to unlink. Please try again.');
    }
  };

  const handleExportPDF = async () => {
    try {
      const blob: any = await ApiClient.get(`/businesses/${cr_number}/report`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_${cr_number}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setShowMainMenu(false);
    } catch (err) {
      console.error('PDF Download error:', err);
      setError('Failed to download PDF report');
      setShowMainMenu(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}><div className="spinner-gold" /></div>;

  if (error || !business) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
        <h2 style={{ color: '#fff' }}>Error Loading Business</h2>
        <p style={{ color: 'var(--text-muted)' }}>{error || 'Record not found'}</p>
        <button onClick={() => navigate('/dashboard')} className="btn-luxury" style={{ marginTop: '20px' }}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1800px', margin: '0 auto', padding: '24px 40px' }}>
      {/* 1. HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '60px', height: '60px', borderRadius: '16px',
            background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Building2 size={32} color="#3b82f6" />
          </div>
          <div>

            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>{business.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              <span>CR: {business.cr_number}</span>
              <span style={{ color: 'var(--gold-primary)' }}>•</span>
              <span style={{ color: 'var(--gold-primary)' }}>{business.business_nature?.toUpperCase() || 'COMMERCIAL'}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span>Expires: {new Date(business.cr_expiry_date).toLocaleDateString()}</span>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ 
                padding: '2px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900,
                background: `${getStatusColor(business.status)}20`,
                color: getStatusColor(business.status),
                border: `1px solid ${getStatusColor(business.status)}40`,
                textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                {business.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            className="btn-icon-luxury"
            style={{ padding: '12px' }}
            onClick={() => setShowMainMenu(!showMainMenu)}
          >
            <MoreVertical size={20} />
          </button>

          {showMainMenu && (
            <>
              <div
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }}
                onClick={() => setShowMainMenu(false)}
              />
              <div className="luxury-card" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '12px',
                width: '220px', zIndex: 100, padding: '8px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
                animation: 'fadeIn 0.2s ease-out'
              }}>
                <button
                  className="menu-item"
                  onClick={handleExportPDF}
                >
                  <Download size={16} color="var(--gold-primary)" />
                  <span>Download PDF Report</span>
                </button>
                <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 8px' }} />
                <button
                  className="menu-item"
                  style={{ color: '#ef4444' }}
                  onClick={handleDeleteRecord}
                >
                  <Trash2 size={16} />
                  <span>Delete Record</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. COMPLIANCE STATUS BANNER (Conditional) */}
      {business.status !== 'COMPLIANT' && (
        <div style={{
          background: `${getStatusColor(business.status)}10`, // 10% opacity
          border: `1px solid ${getStatusColor(business.status)}40`, // 25% opacity
          borderRadius: '20px', padding: '24px 32px', marginBottom: '32px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', gap: '40px', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: getStatusColor(business.status), letterSpacing: '1.5px', marginBottom: '8px' }}>COMPLIANCE STATUS</p>
              <div style={{
                background: getStatusColor(business.status), color: '#fff', padding: '8px 24px',
                borderRadius: '12px', fontWeight: 900, fontSize: '1.2rem', letterSpacing: '0.5px'
              }}>
                {business.status.replace('_', ' ')}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '40px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', marginBottom: '12px' }}>{business.compliance_reasons?.length || 0} ISSUES FOUND</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {business.compliance_reasons?.slice(0, 2).map((r: any, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%',
                      background: r.severity === 'HIGH' ? '#ef4444' : (r.severity === 'MEDIUM' ? '#fbbf24' : '#3b82f6'),
                      color: '#fff', fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>{i + 1}</div>
                    {r.message}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '40px' }}>
              <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '4px' }}>LAST REVIEWED</p>
              <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{activities.length > 0 ? new Date(activities[0].created_at).toLocaleString() : 'N/A'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>BY ADMIN_SYSTEM_01</p>
            </div>
          </div>

          <button
            className="btn-luxury"
            style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800 }}
            onClick={() => scrollToSection(business.status === 'NON_COMPLIANT' ? 'docs' : 'people')}
          >
            Fix Issues <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* 3. MAIN DASHBOARD GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1.4fr 380px',
        gap: '32px'
      }}>

        {/* LEFT COL: Business Profile & Documents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Business Profile */}
          <div className="luxury-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={18} color="var(--gold-primary)" />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>BUSINESS PROFILE</h3>
              </div>
              <button
                className="btn-luxury"
                style={{ padding: '8px 16px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                onClick={() => {
                  setEditForm({
                    name: business.name,
                    nationality: business.nationality,
                    business_type: business.business_type,
                    business_nature: business.business_nature,
                    address: business.address,
                    mobile: business.mobile,
                    cr_expiry_date: business.cr_expiry_date
                  });
                  setShowEditModal(true);
                }}
              >
                <Edit3 size={14} /> Edit Profile
              </button>
            </div>

            <div className="info-table">
              {[
                ['Business Name', business.name],
                ['Nationality', business.nationality],
                ['Business Type', business.business_type],
                ['Business Nature', business.business_nature],
                ['Registered Address', business.address],
                ['Contact Mobile', business.mobile],
                ['CR Number', business.cr_number],
                ['CR Expiry Date', `${new Date(business.cr_expiry_date).toLocaleDateString()} (In ${metrics?.daysToCr} days)`],
                ['CR Status', <span style={{ color: getStatusColor(business.status), fontWeight: 800 }}>{business.status.replace('_', ' ')}</span>]
              ].map(([label, value], i) => (
                <div key={i} className="info-row">
                  <span className="info-label">{label}</span>
                  <span className="info-value">{value as React.ReactNode}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Timeline (DE-CLUTTERED) */}
          <div className="luxury-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <History size={16} color="var(--gold-primary)" />
                </div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>ACTIVITY TIMELINE</h3>
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              maxHeight: '420px',
              overflowY: 'auto',
              paddingRight: '8px',
              marginBottom: '20px'
            }} className="custom-scrollbar">
              {(activities || []).map((item: any, i: number) => (
                <div key={i} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.severity === 'HIGH' ? '#ef4444' : 'var(--gold-primary)', zIndex: 2 }}></div>
                    {i !== (activities.length - 1) && (
                      <div style={{ flex: 1, width: '1px', background: 'rgba(255,255,255,0.05)', margin: '4px 0' }}></div>
                    )}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i === (activities.length - 1) ? '0' : '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>{new Date(item.created_at).toLocaleDateString()} • {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span style={{
                        fontSize: '0.55rem', fontWeight: 900, padding: '2px 6px', borderRadius: '4px',
                        background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {item.event_type}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', lineHeight: '1.4' }}>{item.description}</p>
                  </div>
                </div>
              ))}
              {(!activities || activities.length === 0) && (
                <div style={{ padding: '40px', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.05)' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No activities recorded yet.</p>
                </div>
              )}
            </div>

            <button
              className="btn-luxury"
              style={{ width: '100%', marginTop: '24px', padding: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '0.8rem' }}
              onClick={handleLogVisit}
            >
              <MapPin size={16} /> Log Physical Visit
            </button>
          </div>
        </div>

        {/* MIDDLE COL: People & Identities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} ref={peopleSectionRef}>
          <div className="luxury-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <User size={18} color="var(--gold-primary)" />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>PEOPLE & IDENTITIES</h3>
              </div>
              <span
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setShowPeopleModal(true)}
              >
                View All
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* 1. Standalone Corporate Card (If applicable) */}
              {business.owner_type === 'COMPANY' && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.02) 100%)', 
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                  borderRadius: '16px', padding: '16px'
                }}>
                   <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                      <div style={{ 
                        width: '40px', height: '40px', borderRadius: '10px', 
                        background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Building2 size={20} color="#3b82f6" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.5px' }}>BUSINESS OWNER (COMPANY)</div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: '2px 0' }}>{business.owner_company_name}</h4>
                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>CR: {business.owner_cr_number}</div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             {(() => {
                                const crDoc = business.documents?.find((d: any) => d.document_type === 'Owner Corporate CR');
                                const expiry = crDoc?.expiry_date ? new Date(crDoc.expiry_date) : null;
                                const isExp = expiry && expiry < new Date();
                                return (
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: !expiry ? (business.owner_cr_number ? '#f59e0b' : 'var(--text-muted)') : (isExp ? '#ef4444' : '#10b981') }}>
                                       {!expiry ? (business.owner_cr_number ? 'DOC MISSING' : 'MISSING CR') : (isExp ? 'EXPIRED' : 'ACTIVE')}
                                    </div>
                                    {expiry && <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)' }}>EXP: {expiry.toLocaleDateString()}</div>}
                                  </div>
                                );
                             })()}
                             <button 
                                className="action-btn-dim" 
                                style={{ width: '28px', height: '28px', border: 'none', background: 'rgba(255,255,255,0.05)' }}
                                onClick={() => {
                                  const crDoc = business.documents?.find((d: any) => d.document_type === 'Owner Corporate CR');
                                  setCompanyForm({
                                    name: business.owner_company_name || '',
                                    cr_number: business.owner_cr_number || '',
                                    expiry_date: crDoc?.expiry_date ? crDoc.expiry_date.split('T')[0] : '',
                                    file: null,
                                    existingFileUrl: crDoc?.file_url
                                  });
                                  setIsEditingCompany(true);
                                  setShowCompanyForm(true);
                                }}
                             >
                                <Edit3 size={12} />
                             </button>
                            {/* Corporate Unlink button removed as per user request */}
                          </div>
                        </div>
                      </div>
                   </div>
                </div>
              )}

              {[
                { label: 'BUSINESS OWNER', role: 'OWNER', fallback: business.owner },
                { label: 'MANAGER INCHARGE', role: 'MANAGER', fallback: business.manager },
                { label: 'AUTHORIZED PERSON', role: 'AUTHORIZED', fallback: business.authorized_person }
              ].map(({ label, role, fallback }) => {
                let members = (business.members || []).filter((m: any) => m.role === role);
                
                // If not in members list, use the direct field as fallback
                if (members.length === 0 && fallback) {
                  members = [fallback];
                }
                
                if (members.length === 0) {
                  return (
                    <div key={label} style={{
                      background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)',
                      borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Plus size={14} color="var(--text-muted)" />
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>No {label.toLowerCase()} linked</div>
                    </div>
                  );
                }

                return members.map((person: any) => {
                  const personExpiryDate = person?.expiry_date ? new Date(person.expiry_date) : null;
                  const today = new Date();
                  const isPersonExpired = personExpiryDate && personExpiryDate.getTime() < today.getTime();
                  const personDiffDays = personExpiryDate ? Math.ceil((personExpiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  const isPersonWarning = !isPersonExpired && personDiffDays <= 60;
                  const isGracePeriod = isPersonExpired && Math.abs(personDiffDays) <= 30;

                  return (
                    <div key={person.id} style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '12px',
                            background: role === 'AUTHORIZED' ? 'rgba(59, 130, 246, 0.1)' : (role === 'MANAGER' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 215, 0, 0.1)'), 
                            border: `1px solid ${role === 'AUTHORIZED' ? 'rgba(59, 130, 246, 0.2)' : (role === 'MANAGER' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 215, 0, 0.2)')}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {role === 'AUTHORIZED' ? <ShieldCheck size={20} color="#3b82f6" /> : (role === 'MANAGER' ? <User size={20} color="#10b981" /> : <User size={20} color="var(--gold-primary)" />)}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <div style={{ 
                                fontSize: '0.8rem', 
                                fontWeight: 900, 
                                color: role === 'AUTHORIZED' ? '#3b82f6' : (role === 'MANAGER' ? '#10b981' : 'var(--gold-primary)'), 
                                letterSpacing: '1px' 
                              }}>
                                {label}
                                {role === 'OWNER' && (
                                <span style={{ 
                                  fontSize: '0.6rem', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px',
                                  background: (business.owner_type === 'COMPANY' && person.id === business.owner_id) ? 'rgba(59, 130, 246, 0.1)' : 'rgba(212, 175, 55, 0.1)', 
                                  color: (business.owner_type === 'COMPANY' && person.id === business.owner_id) ? '#3b82f6' : 'var(--gold-primary)', 
                                  border: '1px solid rgba(255,255,255,0.05)', fontWeight: 800,
                                  letterSpacing: '0.5px'
                                }}>
                                  {(business.owner_type === 'COMPANY' && person.id === business.owner_id) ? 'REPRESENTATIVE' : 'INDIVIDUAL OWNER'}
                                </span>
                                )}
                              </div>
                            </div>
                            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', margin: '0' }}>{person?.name || 'Awaiting ID Scan'}</h4>
                            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>QID: {person?.qid_number || '—'}</p>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                             <div style={{ 
                               fontSize: '0.7rem', 
                               fontWeight: 800, 
                               color: isPersonExpired ? '#ef4444' : (isPersonWarning ? '#f59e0b' : '#10b981'),
                               letterSpacing: '1px'
                             }}>
                               {isPersonExpired ? (isGracePeriod ? 'GRACE PERIOD' : 'EXPIRED') : (isPersonWarning ? 'EXPIRING SOON' : 'ACTIVE')}
                             </div>
                             <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                               EXP: {personExpiryDate ? personExpiryDate.toLocaleDateString() : 'N/A'}
                             </div>
                          </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                            {(isPersonExpired || !personExpiryDate) ? (
                              <button
                                className="btn-luxury"
                                style={{ padding: '6px 14px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                 onClick={() => { 
                                   setSelectedRole(person.role || 'STAFF');
                                   setScanEmployer(person.employer || null);
                                   setShowScanModal(true); 
                                 }}
                              >
                                Update ID
                              </button>
                            ) : (
                             <button
                                className="action-btn-dim"
                                style={{ width: '32px', height: '32px', border: '1px solid rgba(255,255,255,0.05)' }}
                                onClick={() => navigate(`/user/${person.id}`)}
                              >
                                <ExternalLink size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })}
            </div>
          </div>

          {/* COMPLIANCE CHECKLIST SUMMARY */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} color="var(--gold-primary)" />
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>CHECKLIST SUMMARY</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={20} color="#10b981" /></div>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '12px', marginBottom: '4px' }}>{metrics?.validDocs}/{metrics?.totalDocs}</p>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Docs Valid</p>
              </div>

              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div className="metric-icon" style={{ background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} color="var(--gold-primary)" /></div>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--gold-primary)', marginTop: '12px', marginBottom: '4px' }}>{metrics?.expiringSoon}</p>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Expiring Soon</p>
              </div>

              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertOctagon size={20} color="#ef4444" /></div>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#ef4444', marginTop: '12px', marginBottom: '4px' }}>{metrics?.expiredItems}</p>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Expired Items</p>
              </div>

              <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'rgba(59, 130, 246, 0.03)' }}>
                <div className="metric-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={20} color="#3b82f6" /></div>
                <p style={{ fontSize: '1.5rem', fontWeight: 900, color: '#3b82f6', marginTop: '12px', marginBottom: '4px' }}>{metrics?.daysToCr}</p>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Days to Expiry</p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COL: Timeline & Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          {/* Documents Checklist (MINIMALIST CARDS) */}
          <div className="luxury-card" style={{ padding: '24px' }} ref={docsSectionRef}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={16} color="#3b82f6" />
                </div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fff', letterSpacing: '1px' }}>DOCUMENTS</h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                "Authorization Letter",
                "Commercial License (CR)",
                "Authorized Signatures",
                "Establishment Card",
                "Manager Trade License"
              ].map((name) => {
                const doc = business.documents?.find((d: any) => d.document_type.includes(name.split(' ')[0]));
                const expiryDate = doc ? new Date(doc.expiry_date) : null;
                const now = new Date();
                const diffDays = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : -1;

                let statusIcon = <XCircle size={18} color="#ef4444" />;
                if (doc) {
                  if (diffDays < 0) statusIcon = <XCircle size={18} color="#ef4444" />;
                  else if (diffDays <= 30) statusIcon = <AlertTriangle size={18} color="#f59e0b" />;
                  else statusIcon = <CheckCircle2 size={18} color="#10b981" />;
                }

                return (
                  <div key={name} style={{
                    background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', overflow: 'hidden' }}>
                      <div style={{ flexShrink: 0 }}>{statusIcon}</div>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                          {expiryDate ? `Expires ${expiryDate.toLocaleDateString()}` : 'Not Uploaded'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', marginLeft: '12px' }}>
                      <button
                        className="action-btn-dim"
                        style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                        title="View Document"
                        onClick={() => {
                          if (doc?.file_url) window.open(doc.file_url, '_blank');
                          else alert('Document file not available');
                        }}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        className="action-btn-dim"
                        style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                        title="Upload/Replace"
                        onClick={() => { setActiveDocType(name); setShowUploadModal(true); }}
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        className="action-btn-dim"
                        style={{ width: '28px', height: '28px', borderRadius: '6px' }}
                        title="Edit Expiry"
                        onClick={() => {
                          setActiveDocType(name);
                          setEditExpiryDate(doc?.expiry_date ? doc.expiry_date.split('T')[0] : '');
                          setShowEditExpiryModal(true);
                        }}
                      >
                        <Calendar size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Notes */}
          <div className="luxury-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <Edit3 size={18} color="var(--gold-primary)" />
              <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1px' }}>OPERATIONAL NOTES</h3>
            </div>

            <textarea
              placeholder="Add a compliance note..."
              className="input-luxury"
              style={{ height: '100px', marginBottom: '16px', padding: '12px', resize: 'none' }}
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <button
              className="btn-gold"
              style={{ width: '100%', padding: '12px' }}
              onClick={handleAddNote}
              disabled={addingNote}
            >
              Post Note
            </button>

            <div style={{ marginTop: '24px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px' }}>
              {business.notes?.map((n: any) => (
                <div key={n.id} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>{new Date(n.created_at).toLocaleString()}</p>
                    <button
                      onClick={() => handleDeleteNote(n.id)}
                      title="Delete Note"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        padding: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        transition: 'all 0.2s',
                        color: '#ef4444'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{n.content}</p>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>By ADMIN_SYSTEM_01</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showScanModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div className="luxury-card" style={{ width: '95%', height: '90%', padding: '20px', position: 'relative', overflow: 'hidden' }}>
            <button
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', zIndex: 10, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => {
                 setShowScanModal(false);
              }}
            >
              <X size={24} />
            </button>

            <iframe 
              src={`/scan?isEmbedded=true&businessId=${business.id}&role=${selectedRole}${scanEmployer ? `&employer=${encodeURIComponent(scanEmployer)}` : ''}&returnUrl=${window.location.pathname}`}
              style={{ width: '100%', height: '80vh', border: 'none' }}
              title="Identity Scanner"
            />
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="luxury-card" style={{ width: '600px', padding: '32px', position: 'relative' }}>
            <button
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              onClick={() => setShowEditModal(false)}
            >
              <AlertCircle size={24} style={{ transform: 'rotate(45deg)' }} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>Edit Business Profile</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Update the core identification details for this business.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="input-field">
                <label>Business Name</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="input-field">
                <label>Nationality</label>
                <input value={editForm.nationality} onChange={e => setEditForm({ ...editForm, nationality: e.target.value })} />
              </div>
              <div className="input-field">
                <label>Business Type</label>
                <input value={editForm.business_type} onChange={e => setEditForm({ ...editForm, business_type: e.target.value })} />
              </div>
              <div className="input-field">
                <label>Business Nature</label>
                <input value={editForm.business_nature} onChange={e => setEditForm({ ...editForm, business_nature: e.target.value })} />
              </div>
              <div className="input-field" style={{ gridColumn: 'span 2' }}>
                <label>Registered Address</label>
                <input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
              <div className="input-field">
                <label>Contact Mobile</label>
                <input value={editForm.mobile} onChange={e => setEditForm({ ...editForm, mobile: e.target.value })} />
              </div>
              <div className="input-field">
                <label>CR Expiry Date</label>
                <input type="date" value={editForm.cr_expiry_date} onChange={e => setEditForm({ ...editForm, cr_expiry_date: e.target.value })} />
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '16px' }}>
              <button className="btn-luxury" style={{ flex: 1, padding: '14px' }} onClick={handleProfileUpdate}>Save Changes</button>
              <button className="btn-icon-luxury" style={{ padding: '14px', width: 'auto', flex: 1 }} onClick={() => setShowEditModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="luxury-card" style={{ width: '600px', padding: '32px', position: 'relative' }}>
            <button
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              onClick={() => setShowUploadModal(false)}
            >
              <AlertCircle size={24} style={{ transform: 'rotate(45deg)' }} />
            </button>

            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>Update Document</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Upload a new copy of <b>{activeDocType}</b> for this record.</p>

            <DocumentUploadRow
              crNumber={business.cr_number}
              docType={activeDocType || ''}
              existingDoc={business.documents?.find((d: any) => d.document_type === activeDocType)}
              onUpdate={() => {
                fetchBusiness();
                setShowUploadModal(false);
              }}
            />
          </div>
        </div>
      )}

      {showEditExpiryModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="luxury-card" style={{ width: '400px', padding: '32px', position: 'relative' }}>
            <button
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              onClick={() => setShowEditExpiryModal(false)}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>Edit Expiry</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '24px' }}>Update expiry for <b>{activeDocType}</b></p>

            <div className="input-field">
              <label>EXPIRY DATE</label>
              <input
                type="date"
                value={editExpiryDate}
                onChange={(e) => setEditExpiryDate(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
              />
            </div>

            <button
              className="btn-luxury"
              style={{ width: '100%', marginTop: '24px', padding: '14px' }}
              onClick={handleExpiryUpdate}
              disabled={updatingExpiry}
            >
              {updatingExpiry ? 'Updating...' : 'Save Expiry'}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .luxury-card {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 20px;
          backdrop-filter: blur(10px);
        }
        .btn-luxury {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 12px !important;
          color: #fff !important;
          font-weight: 700 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
        }
        .btn-luxury:hover {
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(255,255,255,0.2) !important;
          transform: translateY(-1px) !important;
        }
        .btn-icon-luxury {
          background: rgba(255,255,255,0.03) !important;
          border: 1px solid var(--glass-border) !important;
          border-radius: 10px !important;
          color: #fff !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .btn-icon-luxury:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: var(--gold-primary) !important;
          color: var(--gold-primary) !important;
        }
        .info-table {
          display: flex;
          flex-direction: column;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 0;
          border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .info-row:last-child { border-bottom: none; }
        .info-label { font-size: 0.8rem; color: var(--text-muted); font-weight: 500; }
        .info-value { font-size: 0.85rem; color: #fff; font-weight: 700; text-align: right; }
        
        .action-btn-dim {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted); cursor: pointer; transition: all 0.2s ease;
        }
        .action-btn-dim:hover { background: rgba(255,255,255,0.08); color: #fff; }

        .timeline { position: relative; padding-left: 24px; }
        .timeline:before {
          content: ""; position: absolute; left: 6px; top: 0; bottom: 0;
          width: 2px; background: rgba(255,255,255,0.05);
        }
        .timeline-item { position: relative; margin-bottom: 24px; }
        .timeline-point {
          position: absolute; left: -22px; top: 4px;
          width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid var(--bg-dark); background: var(--text-muted);
        }
        .timeline-point.high { background: #ef4444; box-shadow: 0 0 10px rgba(239, 68, 68, 0.4); }
        .timeline-point.warning { background: #fbbf24; }
        .timeline-point.info { background: var(--gold-primary); }
        
        .timeline-time { font-size: 0.65rem; color: var(--text-muted); font-weight: 800; margin-bottom: 4px; }
        .timeline-event { font-size: 0.85rem; color: #fff; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .timeline-meta { font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .severity-badge { font-size: 0.6rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 2px 6px; borderRadius: 4px; }


        .metric-card {
          background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px; padding: 20px;
        }
        .metric-icon {
          width: 44px; height: 44px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }

        .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .input-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .input-field label {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--text-muted);
          letter-spacing: 1px;
        }
        .input-field input {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 10px 14px;
          color: #fff;
          font-size: 0.9rem;
          outline: none;
        }
        .input-field input:focus {
          border-color: var(--gold-primary);
          background: rgba(255,255,255,0.08);
        }
        .menu-item {
          display: flex; align-items: center; gap: 12px;
          width: 100%; padding: 12px 16px; background: transparent;
          border: none; color: #fff; cursor: pointer;
          border-radius: 10px; font-size: 0.85rem; font-weight: 600;
          transition: all 0.2s ease;
        }
        .menu-item:hover {
          background: rgba(255,255,255,0.05);
          transform: translateX(4px);
        }
        .menu-item span { flex: 1; text-align: left; }
      `}</style>

      {showPeopleModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(30px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }}>
          <div style={{ width: '80vw', height: '85vh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.5px' }}>PEOPLE & IDENTITIES</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{peopleList.length} personnel linked to {business.name}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="action-btn-dim"
                  style={{ width: 'auto', padding: '0 16px', fontSize: '0.75rem', fontWeight: 700 }}
                  onClick={fetchBusiness}
                >
                  <RotateCcw size={14} style={{ marginRight: '8px' }} /> Refresh
                </button>
                <button
                  className="btn-luxury"
                  style={{ padding: '12px 24px', background: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold-primary)' }}
                  onClick={() => {
                    setShowPeopleModal(false);
                    setShowAddWorkflow(true);
                    setWorkflowStep(1);
                  }}
                >
                  <Plus size={18} />
                  Add New Person
                </button>
                <button
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={() => setShowPeopleModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="luxury-card" style={{ flex: 1, overflowY: 'auto', padding: '0' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>PERSON</th>
                    <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>ROLE</th>
                    <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>QID NUMBER</th>
                    <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>NATIONALITY</th>
                    <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>EXPIRY STATUS</th>
                    <th style={{ padding: '20px 24px', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px', textAlign: 'center' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Corporate Entity Row (If Company Owner) */}
                  {business.owner_type === 'COMPANY' && (
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(59, 130, 246, 0.02)' }}>
                      <td style={{ padding: '20px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Building2 size={20} color="#3b82f6" />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{business.owner_company_name}</div>
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Corporate Entity</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 24px' }}>
                        <span style={{ fontSize: '0.6rem', padding: '3px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', fontWeight: 800 }}>OWNER (COMPANY)</span>
                      </td>
                      <td style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>CR: {business.owner_cr_number}</td>
                      <td style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>—</td>
                      <td style={{ padding: '20px 24px' }}>
                        {(() => {
                           const crDoc = business.documents?.find((d: any) => d.document_type === 'Owner Corporate CR');
                           const expiry = crDoc?.expiry_date ? new Date(crDoc.expiry_date) : null;
                           const isExp = expiry && expiry < new Date();
                           return (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: !expiry ? (business.owner_cr_number ? '#f59e0b' : 'var(--text-muted)') : (isExp ? '#ef4444' : '#10b981') }}>
                                 {!expiry ? (business.owner_cr_number ? 'DOC MISSING' : 'MISSING CR') : (isExp ? 'EXPIRED' : 'ACTIVE')}
                               </div>
                               {expiry && <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>Exp: {expiry.toLocaleDateString()}</div>}
                             </div>
                           );
                        })()}
                      </td>
                      <td style={{ padding: '20px 24px', textAlign: 'center' }}>
                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                           <button 
                              className="action-btn-dim" 
                              style={{ width: '32px', height: '32px' }} 
                              title="View CR Document" 
                              onClick={() => {
                                 const crDoc = business.documents?.find((d: any) => d.document_type === 'Owner Corporate CR');
                                 if (crDoc?.file_url) window.open(crDoc.file_url, '_blank');
                                 else alert('No CR document found');
                              }}
                           >
                              <Eye size={14} />
                           </button>
                           <button 
                              className="action-btn-dim" 
                              style={{ width: '32px', height: '32px' }} 
                              title="Edit Company Details" 
                              onClick={() => {
                                 const crDoc = business.documents?.find((d: any) => d.document_type === 'Owner Corporate CR');
                                 setCompanyForm({
                                    name: business.owner_company_name || '',
                                    cr_number: business.owner_cr_number || '',
                                    expiry_date: crDoc?.expiry_date ? crDoc.expiry_date.split('T')[0] : '',
                                    file: null,
                                    existingFileUrl: crDoc?.file_url
                                 });
                                 setIsEditingCompany(true);
                                 setShowCompanyForm(true);
                              }}
                           >
                              <Edit3 size={14} />
                           </button>
                           <button className="action-btn-dim" style={{ width: '32px', height: '32px', color: '#ef4444' }} title="Unlink Company" onClick={() => handleUnlink('corporate', business.owner_company_name, true)}>
                              <Link2Off size={14} />
                           </button>
                         </div>
                      </td>
                    </tr>
                  )}

                  {peopleList.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No linked personnel found for this business. Click "Add New Person" to link someone.
                      </td>
                    </tr>
                  ) : (
                    peopleList.map((person, idx) => {
                      if (!person) return null;
                      const expiryDate = new Date(person.expiry_date || Date.now());
                      const now = new Date();
                      const diffTime = expiryDate.getTime() - now.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      let statusColor = 'rgba(255,255,255,0.3)';
                      let statusLabel = 'ACTIVE';

                      if (diffDays < 0) {
                        const graceDays = Math.abs(diffDays);
                        if (graceDays <= 30) {
                          statusColor = '#ef4444';
                          statusLabel = 'GRACE PERIOD';
                        } else {
                          statusColor = '#ef4444';
                          statusLabel = 'EXPIRED';
                        }
                      } else if (diffDays <= 60) {
                        statusColor = '#ef4444';
                        statusLabel = 'EXPIRING SOON';
                      }

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(212, 175, 55, 0.1)', border: '1px solid rgba(212, 175, 55, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--gold-primary)' }}>
                                {person.name ? person.name.charAt(0) : '?'}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#fff' }}>{person.name || 'Unknown'}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{person.mobile_number || 'No mobile'}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '20px 24px' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: person.role === 'OWNER' ? 'var(--gold-primary)' : person.role === 'AUTHORIZED' ? '#3b82f6' : 'var(--text-muted)', background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                              {person.role || 'STAFF'}
                            </span>
                          </td>
                          <td style={{ padding: '20px 24px', fontSize: '0.85rem', color: '#fff', fontFamily: 'monospace' }}>{person.qid_number || 'N/A'}</td>
                          <td style={{ padding: '20px 24px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>{person.nationality || 'N/A'}</td>
                          <td style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: statusColor }}>{statusLabel}</span>
                              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Expires: {person.expiry_date ? new Date(person.expiry_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </td>
                          <td style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                              <button
                                className="action-btn-dim"
                                onClick={() => {
                                   setSelectedRole(person.role || 'STAFF');
                                   setScanEmployer(person.employer || null);
                                   setShowScanModal(true);
                                }}
                              >
                                <RotateCcw size={14} />
                              </button>
                              <button
                                className="action-btn-dim"
                                title="Edit Person"
                                onClick={() => {
                                  setEditForm({
                                    id: person.id,
                                    name: person.name,
                                    qid_number: person.qid_number,
                                    mobile: person.mobile_number,
                                    expiry_date: person.expiry_date ? person.expiry_date.split('T')[0] : '',
                                    nationality: person.nationality
                                  });
                                  setShowEditModal(true);
                                }}
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                className="action-btn-dim"
                                title="View Profile"
                                onClick={() => navigate(`/user/${person.id}`)}
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                className="action-btn-dim"
                                title="Unlink Member"
                                style={{ color: '#ef4444' }}
                                onClick={() => handleUnlink(person.id, person.name)}
                              >
                                <UserMinus size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showDeleteNoteModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
        }}>
          <div className="luxury-card animate-fade-in" style={{ width: '400px', padding: '32px', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}>
              <Trash2 size={32} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Confirm Deletion</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '32px', lineHeight: 1.6 }}>
              Are you sure you want to remove this operational note? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn-luxury"
                style={{ flex: 1, padding: '12px' }}
                onClick={() => setShowDeleteNoteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-gold"
                style={{ flex: 1, padding: '12px', background: '#ef4444', borderColor: '#ef4444' }}
                onClick={confirmDeleteNote}
              >
                Delete Note
              </button>
            </div>
          </div>
        </div>
      )}
      {showAddWorkflow && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
        }}>
          <div className="luxury-card animate-fade-in" style={{ width: '400px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>
                {workflowStep === 1 ? 'SELECT ROLE' : workflowStep === 2 ? 'OWNER TYPE' : 'ADDITION METHOD'}
              </h2>
              <button onClick={() => { setShowAddWorkflow(false); setWorkflowStep(1); }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {workflowStep === 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { id: 'OWNER', label: 'Business Owner', icon: <ShieldCheck size={18} /> },
                  { id: 'MANAGER', label: 'Manager Incharge', icon: <User size={18} /> },
                  { id: 'AUTHORIZED', label: 'Authorized Person', icon: <CheckCircle2 size={18} /> }
                ].map(role => (
                  <button
                    key={role.id}
                    className="menu-item"
                    onClick={() => {
                      setSelectedRole(role.id);
                      if (role.id === 'OWNER') setWorkflowStep(2);
                      else setWorkflowStep(3);
                    }}
                    style={{ background: 'rgba(255,255,255,0.03)', padding: '16px' }}
                  >
                    <div style={{ color: 'var(--gold-primary)' }}>{role.icon}</div>
                    <span>{role.label}</span>
                    <ArrowRight size={14} style={{ opacity: 0.3 }} />
                  </button>
                ))}
              </div>
            ) : workflowStep === 2 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="menu-item"
                  onClick={() => setWorkflowStep(3)}
                  style={{ background: 'rgba(255,255,255,0.03)', padding: '16px' }}
                >
                  <User size={18} style={{ color: 'var(--gold-primary)' }} />
                  <span>Individual Owner</span>
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowAddWorkflow(false);
                    setShowCompanyForm(true);
                  }}
                  style={{ background: 'rgba(255,255,255,0.03)', padding: '16px' }}
                >
                  <Building2 size={18} style={{ color: 'var(--gold-primary)' }} />
                  <span>Company / Corporate Owner</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowAddWorkflow(false);
                    setShowSearchModal(true);
                  }}
                  style={{ background: 'rgba(255,255,255,0.03)', padding: '16px' }}
                >
                  <Search size={18} style={{ color: 'var(--gold-primary)' }} />
                  <span>Link from Existing DB</span>
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowAddWorkflow(false);
                    setShowScanModal(true);
                  }}
                  style={{ background: 'rgba(255,255,255,0.03)', padding: '16px' }}
                >
                  <Scan size={18} style={{ color: 'var(--gold-primary)' }} />
                  <span>Scan New QID (OCR)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showCompanyForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
        }}>
          <div className="luxury-card animate-fade-in" style={{ width: '450px', padding: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginBottom: '8px' }}>COMPANY OWNER DETAILS</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>Register the corporate entity. You will scan the representative's ID in the next step.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-field">
                <label>COMPANY NAME</label>
                <input
                  placeholder="Legal Entity Name"
                  value={companyForm.name}
                  onChange={e => setCompanyForm({...companyForm, name: e.target.value})}
                />
              </div>
              <div className="input-field">
                <label>COMPANY CR NUMBER</label>
                <input
                  placeholder="Commercial Registration"
                  value={companyForm.cr_number}
                  onChange={e => setCompanyForm({...companyForm, cr_number: e.target.value})}
                />
              </div>
              
              <div className="input-field">
                <label>CR EXPIRY DATE</label>
                <input
                  type="date"
                  value={companyForm.expiry_date}
                  onChange={e => setCompanyForm({...companyForm, expiry_date: e.target.value})}
                />
              </div>
              
              <div className="input-field">
                <label>UPLOAD CR DOCUMENT</label>
                <div 
                  onClick={() => document.getElementById('cr_file_input')?.click()}
                  style={{ 
                    border: '1px dashed var(--glass-border)', borderRadius: '12px', padding: '20px', 
                    textAlign: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                >
                  {companyForm.file ? (
                    <div style={{ color: 'var(--gold-primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                      <CheckCircle2 size={24} style={{ marginBottom: '8px' }} />
                      <br />{companyForm.file.name}
                    </div>
                  ) : companyForm.existingFileUrl ? (
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(companyForm.existingFileUrl, '_blank');
                      }}
                      style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: 700 }}
                    >
                      <Eye size={24} style={{ marginBottom: '8px' }} />
                      <br />PREVIEW EXISTING DOC
                      <div style={{ fontSize: '0.6rem', opacity: 0.5, marginTop: '4px' }}>(Click to View / Click outside to change)</div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      <Download size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                      <br />Select or Drop CR PDF/Image
                    </div>
                  )}
                  <input 
                    id="cr_file_input" 
                    type="file" 
                    hidden 
                    onChange={e => setCompanyForm({...companyForm, file: e.target.files?.[0] || null})} 
                  />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
              <button className="btn-luxury" style={{ flex: 1, padding: '12px' }} onClick={() => setShowCompanyForm(false)}>Cancel</button>
              <button
                className="btn-gold"
                style={{ flex: 1, padding: '12px', background: 'var(--gold-primary)', color: '#000', fontWeight: 800 }}
                disabled={isSubmittingCompany}
                onClick={async () => {
                  if (!companyForm.name || !companyForm.cr_number || (!companyForm.file && !isEditingCompany)) {
                    return alert('Please provide company name, CR number, and upload the CR document.');
                  }
                  setIsSubmittingCompany(true);
                  try {
                    if (companyForm.file || companyForm.expiry_date) {
                      const formData = new FormData();
                      if (companyForm.file) formData.append('file', companyForm.file);
                      formData.append('document_type', 'Owner Corporate CR');
                      formData.append('is_available', 'true');
                      if (companyForm.expiry_date) formData.append('expiry_date', companyForm.expiry_date);
                      await ApiClient.post(`/businesses/${cr_number}/documents`, formData);
                    }

                    // 2. Update Business Profile
                    await ApiClient.put(`/businesses/${cr_number}`, {
                      owner_type: 'COMPANY',
                      owner_name: companyForm.name,
                      owner_cr_number: companyForm.cr_number,
                      is_company_owner: true
                    });

                    // 3. Move to Individual Representative choice (Scan vs DB)
                    await fetchBusiness();
                    setShowCompanyForm(false);
                    if (!isEditingCompany) {
                       setScanEmployer(companyForm.name);
                       setSelectedRole('OWNER');
                       setWorkflowStep(3); // Addition Method step
                       setShowAddWorkflow(true);
                    }
                    setIsEditingCompany(false);
                  } catch (e) {
                    alert('Error updating company owner. Please try again.');
                  } finally {
                    setIsSubmittingCompany(false);
                  }
                }}
              >
                {isSubmittingCompany ? 'Processing...' : (isEditingCompany ? 'Update Company Details' : 'Continue to Scan Representative')}
              </button>
            </div>
          </div>
        </div>
      )}
      {showSearchModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200
        }}>
          <div className="luxury-card animate-fade-in" style={{ width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>LINK EXISTING PERSON</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Search by Name or QID to link to this business.</p>
              </div>
              <button onClick={() => setShowSearchModal(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                autoFocus
                placeholder="Type name or QID..."
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.length > 2) {
                    setIsSearching(true);
                    ApiClient.get(`/users/search?query=${e.target.value}`)
                      .then((res: any) => setSearchResults(res))
                      .catch(() => {})
                      .finally(() => setIsSearching(false));
                  } else {
                    setSearchResults([]);
                  }
                }}
                style={{
                  width: '100%', padding: '14px 16px 14px 48px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--glass-border)', borderRadius: '12px', color: '#fff',
                  fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s ease'
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px' }}>
              {isSearching ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Searching database...</div>
              ) : searchResults.length > 0 ? (
                searchResults.map(person => (
                  <button
                    key={person.id}
                    onClick={async () => {
                      setIsLinking(true);
                      try {
                        await ApiClient.post('/users/link', {
                          qid_number: person.qid_number,
                          business_id: business.id,
                          role: selectedRole
                        });
                        fetchBusiness();
                        setShowSearchModal(false);
                      } catch (e) {
                        alert('Error linking person');
                      } finally {
                        setIsLinking(false);
                      }
                    }}
                    className="menu-item"
                    style={{ 
                      padding: '12px 16px', background: 'rgba(255,255,255,0.02)', textAlign: 'left',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}
                    disabled={isLinking}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>{person.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>QID: {person.qid_number}</div>
                    </div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', background: 'rgba(212,175,55,0.05)', padding: '4px 8px', borderRadius: '4px' }}>
                      {isLinking ? 'LINKING...' : 'LINK AS ' + selectedRole}
                    </div>
                  </button>
                ))
              ) : searchQuery.length > 2 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No matches found in database.</div>
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Start typing to search...</div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* PREMIUM UNLINK CONFIRMATION MODAL */}
      {unlinkConfig && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '20px'
        }}>
          <div className="luxury-modal" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
            <div style={{ 
              width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
            }}>
              <AlertTriangle size={32} color="#ef4444" />
            </div>
            
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>Confirm Unlink</h3>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '24px' }}>
              Are you sure you want to unlink <span style={{ color: '#fff', fontWeight: 700 }}>{unlinkConfig.name}</span> from this business?
              {unlinkConfig.isCorporate && (
                <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                  This will reset the business ownership to INDIVIDUAL.
                </div>
              )}
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button 
                className="btn-luxury" 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={() => setUnlinkConfig(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-luxury" 
                style={{ background: '#ef4444', border: '1px solid #ef4444' }}
                onClick={confirmUnlink}
              >
                Unlink Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
