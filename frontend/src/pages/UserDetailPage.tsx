import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Calendar,
  Hash,
  Globe,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  History,
  Info,
  Trash2,
  RefreshCcw
} from 'lucide-react';
import { ApiClient } from '../api/client';

interface UserDetail {
  id: string;
  qid_number: string;
  name: string;
  name_ar?: string;
  dob?: string;
  nationality: string;
  employer: string;
  expiry_date: string;
  mobile_number?: string;
  profession?: string;
  front_image?: string;
  back_image?: string;
  visit_count: number;
  last_seen_at?: string;
  is_manual_edit: boolean;
  status?: string;
  status_message?: string;
}

export const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await ApiClient.get<any>(`/users/${id}`);
        setUser({
          ...response.user,
          status: response.status,
          status_message: response.status_message
        });
      } catch (err: any) {
        setError(err.message || 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchUser();
  }, [id]);

  const getStatusBadge = () => {
    if (!user) return null;
    const statusClass = `status-badge-${(user.status || 'ACTIVE').toLowerCase()}`;
    return (
      <span className={statusClass} style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800 }}>
        {user.status?.replace('_', ' ')}
      </span>
    );
  };

  const getAlertBanner = () => {
    if (!user || user.status === 'ACTIVE') return null;

    const isDanger = user.status === 'INVALID';
    const bgColor = isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    const borderColor = isDanger ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)';
    const iconColor = isDanger ? 'var(--danger)' : 'var(--amber)';

    return (
      <div className="animate-slide-in" style={{
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '20px',
        padding: '24px 32px',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            {isDanger ? <AlertTriangle size={24} color={iconColor} /> : <Clock size={24} color={iconColor} />}
          </div>
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '4px' }}>
              {isDanger ? 'ID EXPIRED / INVALID' : 'ACTION REQUIRED: ID EXPIRING'}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {user.status_message}. Please scan a renewed ID card to update the system.
            </p>
          </div>
        </div>
        <button className="btn-gold" style={{ padding: '12px 32px', fontSize: '0.85rem', color: '#000', fontWeight: 800 }} onClick={() => navigate('/scan')}>
          <RefreshCcw size={18} /> RE-SCAN ID NOW
        </button>
      </div>
    );
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div className="spinner-gold" />
    </div>
  );

  if (error || !user) return (
    <div className="luxury-card" style={{ padding: '60px', textAlign: 'center', margin: '40px auto', maxWidth: '600px' }}>
      <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: '24px' }} />
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '16px' }}>Error Loading Profile</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>{error || 'Customer record not found.'}</p>
      <button className="btn-luxury" onClick={() => navigate(-1)}>
        <ChevronLeft size={18} /> Back to Search
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '60px' }}>
      {/* Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: 600 }}>
          <ChevronLeft size={20} />
          Back to list
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-luxury" style={{ padding: '10px 20px', fontSize: '0.75rem' }} onClick={() => navigate(`/history?qid=${user.qid_number}`)}>
            <History size={16} /> VISIT LOGS
          </button>
          <button className="btn-luxury" style={{ padding: '10px 20px', fontSize: '0.75rem', color: 'var(--danger)' }}>
            <Trash2 size={16} /> DELETE
          </button>
        </div>
      </div>

      {getAlertBanner()}

      {/* Hero Profile Section */}
      <div className="luxury-card" style={{ padding: '40px', marginBottom: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(197, 160, 89, 0.03))', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-start' }}>
          <div style={{ width: '160px', height: '160px', borderRadius: '24px', overflow: 'hidden', border: '2px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)', flexShrink: 0 }}>
            {user.front_image ? (
              <img src={ApiClient.resolveStaticUrl(user.front_image)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Avatar" />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <UserIcon size={48} />
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1 }}>{user.name}</h1>
                {user.name_ar && <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '8px', fontFamily: 'inherit' }}>{user.name_ar}</h2>}
              </div>
              {getStatusBadge()}
            </div>

            <div style={{ display: 'flex', gap: '32px', marginTop: '32px' }}>
              <div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>QATAR ID</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--gold-primary)' }}>{user.qid_number}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>NATIONALITY</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 700 }}>
                  <Globe size={18} color="var(--gold-secondary)" />
                  {user.nationality}
                </div>
              </div>
              <div>
                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', marginBottom: '4px' }}>TOTAL VISITS</p>
                <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>{user.visit_count}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
        {/* Detailed Information */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="luxury-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--gold-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Info size={16} /> IDENTITY DETAILS
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <DetailRow icon={<Calendar size={18} />} label="Date of Birth" value={user.dob || 'Not Available'} />
              <DetailRow icon={<Clock size={18} />} label="ID Expiry Date" value={user.expiry_date} isHighlight valueColor={user.status === 'ACTIVE' ? 'var(--success)' : 'var(--danger)'} />
            </div>
          </div>

          <div className="luxury-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--gold-primary)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Hash size={16} /> CONTACT & ACTIVITY
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <DetailRow icon={<Hash size={18} />} label="Mobile Number" value={user.mobile_number || 'Not Registered'} isHighlight valueColor="var(--gold-primary)" />
              <DetailRow icon={<Clock size={18} />} label="Last Interaction" value={user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : 'First Visit'} />
              <DetailRow icon={<CheckCircle2 size={18} />} label="Audit Status" value={user.is_manual_edit ? 'Manually Audited' : 'Verified Scan'} />
            </div>
          </div>
        </div>

        {/* ID Previews */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="luxury-card" style={{ padding: '32px', flex: 1 }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--gold-primary)', marginBottom: '24px' }}>FRONT SIDE SCAN</h3>
            <div style={{ width: '100%', aspectRatio: '1.6', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: '#000' }}>
              {user.front_image ? (
                <img src={ApiClient.resolveStaticUrl(user.front_image)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Front" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No Front Scan Available</div>
              )}
            </div>
          </div>

          <div className="luxury-card" style={{ padding: '32px', flex: 1 }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 900, letterSpacing: '1px', color: 'var(--gold-primary)', marginBottom: '24px' }}>BACK SIDE SCAN</h3>
            <div style={{ width: '100%', aspectRatio: '1.6', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', background: '#000' }}>
              {user.back_image ? (
                <img src={ApiClient.resolveStaticUrl(user.back_image)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Back" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No Back Scan Available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ icon, label, value, isHighlight, valueColor }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
      {icon}
      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
    </div>
    <span style={{
      fontSize: '0.9rem',
      fontWeight: isHighlight ? 800 : 700,
      color: valueColor || '#fff',
      textAlign: 'right'
    }}>
      {value}
    </span>
  </div>
);
