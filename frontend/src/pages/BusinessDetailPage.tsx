import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ChevronLeft, 
  ShieldCheck, 
  User, 
  FileText,
  AlertCircle,
  Plus,
  Clock,
  History,
  ExternalLink,
  Edit3,
  Lock,
  RefreshCw,
  MoreVertical
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiClient } from '../api/client';

export const BusinessDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: cr_number } = useParams<{ id: string }>();

  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchBusiness = async () => {
    try {
      setLoading(true);
      const data = await ApiClient.get<any>(`/businesses/${cr_number}`);
      setBusiness(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load business details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusiness();
  }, [cr_number]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setAddingNote(true);
    try {
      await ApiClient.post(`/businesses/${cr_number}/notes`, { content: newNote });
      setNewNote('');
      fetchBusiness(); // Refresh to show new note
    } catch (err: any) {
      setError('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return '#10b981';
      case 'PARTIAL': return '#fbbf24';
      case 'NON_COMPLIANT': return '#ef4444';
      case 'INVALID': return '#7f1d1d';
      default: return 'var(--text-muted)';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner-gold" />
      </div>
    );
  }

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
    <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      {/* Header with Compliance State */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div style={{ flex: 1 }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', 
              border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, 
              letterSpacing: '1px', cursor: 'pointer', marginBottom: '16px', padding: 0
            }}
          >
            <ChevronLeft size={14} />
            BACK TO DASHBOARD
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '20px', 
              background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Building2 size={40} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-1px', lineHeight: 1 }}>{business.name}</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>CR: {business.cr_number}</span>
                <span className="dot-sep" style={{ color: 'var(--glass-border)' }}>•</span>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Expires: {new Date(business.cr_expiry_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ 
          background: `${getStatusColor(business.status)}10`, 
          border: `1px solid ${getStatusColor(business.status)}40`, 
          padding: '24px 40px', borderRadius: '24px', textAlign: 'center',
          boxShadow: `0 10px 30px ${getStatusColor(business.status)}10`
        }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 800, color: getStatusColor(business.status), letterSpacing: '2px', marginBottom: '8px' }}>COMPLIANCE STATUS</p>
          <h2 style={{ fontSize: '2rem', fontWeight: 900, color: getStatusColor(business.status), letterSpacing: '1px' }}>{business.status.replace('_', ' ')}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px' }}>
        {/* Left Section: Details & Documents */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Linked Identities */}
          <div className="luxury-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1.5px' }}>LINKED IDENTITIES</h3>
              <RefreshCw size={16} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Owner */}
              <div className="identity-link-card" onClick={() => navigate(`/user/${business.owner.qid_number}`)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} color="var(--gold-primary)" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '0.5px' }}>BUSINESS OWNER</p>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{business.owner.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QID: {business.owner.qid_number}</p>
                  </div>
                </div>
                <ExternalLink size={16} color="var(--text-muted)" />
              </div>

              {/* Authorized Person */}
              {business.authorized_person ? (
                <div className="identity-link-card" onClick={() => navigate(`/user/${business.authorized_person.qid_number}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ShieldCheck size={24} color="#3b82f6" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3b82f6', letterSpacing: '0.5px' }}>AUTHORIZED PERSON</p>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{business.authorized_person.name}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>QID: {business.authorized_person.qid_number}</p>
                    </div>
                  </div>
                  <ExternalLink size={16} color="var(--text-muted)" />
                </div>
              ) : (
                <div className="identity-link-card disabled" style={{ cursor: 'default', opacity: 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Lock size={24} color="var(--text-muted)" />
                    </div>
                    <div>
                      <p style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>AUTHORIZED PERSON</p>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)' }}>Not Assigned</h4>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Document Checklist */}
          <div className="luxury-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1.5px', marginBottom: '24px' }}>COMPLIANCE CHECKLIST</h3>
            
            <div className="doc-grid">
              {business.documents.map((doc: any) => (
                <div key={doc.id} className="doc-compliance-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                    <div style={{ 
                      width: '40px', height: '40px', borderRadius: '10px', 
                      background: doc.is_available ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <FileText size={20} color={doc.is_available ? '#10b981' : '#ef4444'} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>{doc.type}</h4>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {doc.expiry_date ? `Expires: ${new Date(doc.expiry_date).toLocaleDateString()}` : 'No expiry set'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <span style={{ 
                      padding: '4px 12px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                      background: doc.is_available ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: doc.is_available ? '#10b981' : '#ef4444',
                      border: `1px solid ${doc.is_available ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                      {doc.is_available ? 'COMPLIANT' : 'MISSING'}
                    </span>
                    <button className="btn-icon-luxury">
                      <Edit3 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button className="add-doc-btn">
                <Plus size={18} />
                Add Missing Document Requirement
              </button>
            </div>
          </div>
        </div>

        {/* Right Section: Notes & Timeline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="luxury-card" style={{ padding: '32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <History size={18} color="var(--gold-primary)" />
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--gold-primary)', letterSpacing: '1.5px' }}>OPERATIONAL NOTES</h3>
            </div>

            {/* Note Input */}
            <div style={{ marginBottom: '32px' }}>
              <textarea 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a compliance note (e.g., Customer promised to bring ID tomorrow)..."
                className="input-luxury"
                style={{ height: '100px', resize: 'none', padding: '16px', fontSize: '0.9rem' }}
              />
              <button 
                onClick={handleAddNote}
                disabled={addingNote || !newNote.trim()}
                className="btn-gold" 
                style={{ width: '100%', height: '48px', marginTop: '12px' }}
              >
                {addingNote ? <div className="spinner-gold" style={{ width: '20px', height: '20px' }} /> : 'Post Note'}
              </button>
            </div>

            {/* Notes List */}
            <div className="notes-timeline" style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              {business.notes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.3 }}>
                  <p style={{ fontSize: '0.85rem' }}>No operational notes yet.</p>
                </div>
              ) : (
                business.notes.map((note: any) => (
                  <div key={note.id} className="note-item">
                    <div className="note-header">
                      <div className="note-time">
                        <Clock size={12} />
                        {new Date(note.created_at).toLocaleString()}
                      </div>
                      <MoreVertical size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} />
                    </div>
                    <p className="note-content">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .luxury-card {
          background: var(--glass-bg);
          border: 1px solid var(--glass-border);
          border-radius: 24px;
        }
        .identity-link-card {
          padding: 20px;
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .identity-link-card:hover:not(.disabled) {
          border-color: var(--gold-primary);
          background: rgba(212, 175, 55, 0.05);
          transform: translateY(-2px);
        }
        .doc-compliance-row {
          display: flex;
          align-items: center;
          padding: 16px;
          background: rgba(255,255,255,0.01);
          border-bottom: 1px solid var(--glass-border);
          transition: background 0.2s ease;
        }
        .doc-compliance-row:hover {
          background: rgba(255,255,255,0.03);
        }
        .doc-compliance-row:last-child {
          border-bottom: none;
        }
        .btn-icon-luxury {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-icon-luxury:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.2);
        }
        .add-doc-btn {
          width: 100%;
          padding: 16px;
          background: transparent;
          border: 1px dashed var(--glass-border);
          border-radius: 12px;
          color: var(--text-muted);
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .add-doc-btn:hover {
          color: var(--gold-primary);
          border-color: var(--gold-primary);
          background: rgba(212, 175, 55, 0.02);
        }
        .notes-timeline::-webkit-scrollbar {
          width: 4px;
        }
        .notes-timeline::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.2);
          border-radius: 10px;
        }
        .note-item {
          padding: 16px;
          border-left: 2px solid var(--glass-border);
          margin-bottom: 24px;
          position: relative;
        }
        .note-item:before {
          content: "";
          position: absolute;
          left: -6px;
          top: 20px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--bg-dark);
          border: 2px solid var(--gold-primary);
        }
        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .note-time {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .note-content {
          font-size: 0.9rem;
          line-height: 1.5;
          color: rgba(255,255,255,0.8);
        }
      `}</style>
    </div>
  );
};
