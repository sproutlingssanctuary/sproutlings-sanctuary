import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Card, EmptyState, Btn, SectionTitle } from './UI';
import * as api from '../utils/api';
import ChildrenManager from './ChildrenManager';
import StaffManager from './StaffManager';
import AttendanceHistory from './AttendanceHistory';
import DailyLogs from './DailyLogs';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(ts) {
  if (!ts) return '—';
  const ms = Number(ts);
  if (isNaN(ms)) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function duration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const mins = Math.round((Number(checkOut) - Number(checkIn)) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ url, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 24, padding: 40, maxWidth: 420, width: '90%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>📱 Parent Check-In QR Code</h2>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
          Parents scan this to open the check-in kiosk on their phone
        </p>
        <img
          src={qrUrl}
          alt="QR Code"
          style={{ width: 250, height: 250, borderRadius: 12, border: '2px solid #eee', marginBottom: 20 }}
        />
        <div style={{
          background: '#f8f9fa', borderRadius: 12, padding: '10px 16px',
          fontSize: 12, color: '#666', wordBreak: 'break-all', marginBottom: 24,
        }}>
          {url}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '12px 24px', borderRadius: 12, border: 'none',
              background: '#3A8C6E', color: '#fff', fontWeight: 700,
              fontSize: 15, cursor: 'pointer',
            }}
          >
            🖨️ Print QR Code
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 24px', borderRadius: 12,
              border: '2px solid #eee', background: '#fff',
              fontWeight: 700, fontSize: 15, cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function Dashboard() {
  const [today, setToday]       = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showQR, setShowQR]     = useState(false);
  const [clearing, setClearing] = useState(false);
  const appUrl = window.location.origin;

  const load = useCallback(async () => {
    try {
      const [recs, kids] = await Promise.all([api.getToday(), api.getChildrenFull()]);
      setToday(recs);
      setChildren(kids);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const clearTodayTimeline = async () => {
    if (!window.confirm('Delete ALL of today\'s attendance records? This cannot be undone.')) return;
    setClearing(true);
    try {
      await Promise.all(today.map(r => api.deleteAttendance(r.id)));
      await load();
    } catch (e) { alert('Could not delete some records: ' + e.message); }
    finally { setClearing(false); }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await api.deleteAttendance(id);
      await load();
    } catch (e) { alert('Could not delete: ' + e.message); }
  };

  const checkedIn = children.filter(c => {
    const recs = today.filter(r => r.child_id === c.id);
    if (!recs.length) return false;
    const last = [...recs].sort((a,b)=>(Number(b.check_in)||0)-(Number(a.check_in)||0))[0];
    return last.check_in && !last.check_out;
  });

  const checkedOut = children.filter(c => {
    const recs = today.filter(r => r.child_id === c.id);
    if (!recs.length) return false;
    return recs.some(r => r.check_out);
  });

  const notArrived = children.filter(c => !today.some(r => r.child_id === c.id));

  const StatCard = ({ label, value, color, icon }) => (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px 24px',
      border: `2px solid ${color}30`, textAlign: 'center', flex: 1,
    }}>
      <div style={{ fontSize: 32, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 44, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600, marginTop: 6 }}>{label}</div>
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text3)' }}>Loading…</div>;

  return (
    <div>
      {showQR && <QRModal url={appUrl} onClose={() => setShowQR(false)} />}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 22 }}>Attendance Dashboard</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowQR(true)} style={{
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: '#3A8C6E', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            📱 QR Code for Parents
          </button>
          <button onClick={clearTodayTimeline} disabled={clearing || today.length === 0} style={{
            padding: '10px 20px', borderRadius: 12, border: '2px solid #E8734A',
            background: '#fff', color: '#E8734A', fontWeight: 700, fontSize: 14,
            cursor: today.length === 0 ? 'not-allowed' : 'pointer',
            opacity: today.length === 0 ? 0.5 : 1,
          }}>
            {clearing ? 'Clearing...' : '🗑️ Clear Today'}
          </button>
        </div>
      </div>

      <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>
        {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        {' · '}Auto-refreshes every 30s
      </p>

      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Currently Present" value={checkedIn.length} color="#5BAD5B" icon="✅" />
        <StatCard label="Checked Out" value={checkedOut.length} color="#E8734A" icon="🏠" />
        <StatCard label="Not Arrived" value={notArrived.length} color="#8A9AB0" icon="⏳" />
        <StatCard label="Total Enrolled" value={children.length} color="#3A8C6E" icon="👶" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card style={{ border: '2px solid #5BAD5B30' }}>
          <h3 style={{ fontSize: 16, color: '#5BAD5B', marginBottom: 14, fontWeight: 800 }}>✓ Currently Here ({checkedIn.length})</h3>
          {checkedIn.length === 0
            ? <p style={{ color: 'var(--text3)', fontSize: 14 }}>No children present yet.</p>
            : checkedIn.map(c => {
                const rec = [...today.filter(r => r.child_id === c.id)].sort((a,b)=>(Number(b.check_in)||0)-(Number(a.check_in)||0))[0];
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 12 }}>
                    <Avatar child={c} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>In: {fmt(rec?.check_in)}{rec?.who ? ` · ${rec.who}` : ''}</div>
                    </div>
                    {c.notes && <div title={c.notes} style={{ fontSize: 16, cursor: 'help' }}>⚠️</div>}
                  </div>
                );
              })
          }
        </Card>

        <Card style={{ border: '2px solid #E8734A30' }}>
          <h3 style={{ fontSize: 16, color: '#E8734A', marginBottom: 14, fontWeight: 800 }}>→ Went Home ({checkedOut.length})</h3>
          {checkedOut.length === 0
            ? <p style={{ color: 'var(--text3)', fontSize: 14 }}>No departures yet today.</p>
            : checkedOut.map(c => {
                const recs = today.filter(r => r.child_id === c.id);
                const lastOut = [...recs].filter(r => r.check_out).sort((a,b)=>Number(b.check_out)-Number(a.check_out))[0];
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: '#f9fafb', borderRadius: 12 }}>
                    <Avatar child={c} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {fmt(lastOut?.check_in)} → {fmt(lastOut?.check_out)}
                        {lastOut?.check_in && lastOut?.check_out && (
                          <span style={{ marginLeft: 6, background: '#E8A94A22', color: '#CC8800', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                            {duration(lastOut.check_in, lastOut.check_out)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </Card>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Today's Timeline</h3>
          {today.length > 0 && <span style={{ fontSize: 13, color: 'var(--text3)' }}>Click ✕ to delete individual records</span>}
        </div>
        {today.length === 0
          ? <EmptyState icon="📋" message="No activity recorded today yet." />
          : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {[...today]
                .sort((a, b) => Math.max(Number(b.check_in)||0, Number(b.check_out)||0) - Math.max(Number(a.check_in)||0, Number(a.check_out)||0))
                .map((r, i) => {
                  const c = children.find(ch => ch.id === r.child_id);
                  const isCheckIn = r.check_in && !r.check_out;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: isCheckIn ? '#5BAD5B' : '#E8734A' }} />
                      {c && <Avatar child={c} size={30} />}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700 }}>{r.name || '?'}</span>
                        <span style={{ color: 'var(--text2)', fontSize: 14 }}>
                          {' '}{isCheckIn ? 'checked in' : 'checked out'}{' at '}
                          <strong>{fmt(isCheckIn ? r.check_in : r.check_out)}</strong>
                        </span>
                        {r.who && <span style={{ color: 'var(--text3)', fontSize: 13 }}> · {r.who}</span>}
                      </div>
                      <button
                        onClick={() => deleteRecord(r.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, padding: '4px 8px', borderRadius: 8 }}
                        onMouseEnter={e => e.currentTarget.style.color = '#E8734A'}
                        onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                      >✕</button>
                    </div>
                  );
                })}
            </div>
          )
        }
      </Card>

      {notArrived.length > 0 && (
        <Card style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14, fontWeight: 800, color: 'var(--text2)' }}>⏳ Not Arrived Yet ({notArrived.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {notArrived.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#f9fafb', borderRadius: 12, border: '1px solid var(--border)' }}>
                <Avatar child={c} size={30} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ── AdminView (tabs) ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard',  label: '📊 Dashboard' },
  { id: 'children',   label: '👶 Children' },
  { id: 'staff',      label: '👤 Staff' },
  { id: 'history',    label: '📅 History' },
  { id: 'logs',       label: '📋 Daily Logs' },
];

export default function AdminView({ onBack }) {
  const [tab, setTab] = useState('dashboard');
  const user = api.getCurrentUser();

  const handleLogout = () => {
    api.logout();
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7F5' }}>

      {/* Top bar */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🌱</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>Sproutlings Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user && <span style={{ fontSize: 14, color: 'var(--text2)' }}>👋 {user.name || user.username}</span>}
          <button onClick={onBack} style={{
            padding: '8px 16px', borderRadius: 10, border: '2px solid var(--border)',
            background: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            🏠 Kiosk View
          </button>
          <button onClick={handleLogout} style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#E8734A', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '14px 20px', border: 'none', background: 'none',
              fontFamily: 'Nunito', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              color: tab === t.id ? '#3A8C6E' : 'var(--text2)',
              borderBottom: tab === t.id ? '3px solid #3A8C6E' : '3px solid transparent',
              whiteSpace: 'nowrap', transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'children'  && <ChildrenManager />}
        {tab === 'staff'     && <StaffManager />}
        {tab === 'history'   && <AttendanceHistory />}
        {tab === 'logs'      && <DailyLogs />}
      </div>
    </div>
  );
}
