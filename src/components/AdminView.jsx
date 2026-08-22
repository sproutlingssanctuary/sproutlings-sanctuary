import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Card, EmptyState, Btn, SectionTitle } from './UI';
import * as api from '../utils/api';
import { APP_NAME, APP_EMOJI, APP_SHORT } from '../config';
import ChildrenManager from './ChildrenManager';
import StaffManager from './StaffManager';
import AttendanceHistory from './AttendanceHistory';
import DailyLogs from './DailyLogs';
import Transitions from './Transitions';

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

function QRModal({ url, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div className="glass slide-up" style={{
        borderRadius: 24, padding: 40, maxWidth: 420, width: '90%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>📱 Parent Check-In QR Code</h2>
        <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>
          Parents scan this to open the check-in kiosk on their phone
        </p>
        <img src={qrUrl} alt="QR" style={{ width: 250, height: 250, borderRadius: 12, border: '2px solid var(--border)', marginBottom: 20 }} />
        <div style={{
          background: 'var(--bg)', borderRadius: 12, padding: '10px 16px',
          fontSize: 12, color: 'var(--text3)', wordBreak: 'break-all', marginBottom: 24,
        }}>{url}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => window.print()} className="ripple-btn" style={{
            padding: '12px 24px', borderRadius: 12, border: 'none',
            background: '#3A8C6E', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
          }}>🖨️ Print QR Code</button>
          <button onClick={onClose} style={{
            padding: '12px 24px', borderRadius: 12,
            border: '2px solid var(--border)', background: 'var(--card)',
            fontWeight: 700, fontSize: 15, cursor: 'pointer', color: 'var(--text)',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [today, setToday]       = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showQR, setShowQR]     = useState(false);
  const [clearing, setClearing] = useState(false);
  const [presentCount, setPresentCount] = useState(0);
  const appUrl = window.location.origin;

  const load = useCallback(async () => {
    try {
      const [recs, kids] = await Promise.all([api.getToday(), api.getChildrenFull()]);
      setToday(recs);
      setChildren(kids);
      const present = kids.filter(c => {
        const rs = recs.filter(r => r.child_id === c.id);
        if (!rs.length) return false;
        const last = [...rs].sort((a,b)=>(Number(b.check_in)||0)-(Number(a.check_in)||0))[0];
        return last.check_in && !last.check_out;
      });
      setPresentCount(prev => {
        if (prev !== present.length) {
          // trigger pulse animation
          const el = document.getElementById('present-counter');
          if (el) { el.classList.remove('count-pulse'); void el.offsetWidth; el.classList.add('count-pulse'); }
        }
        return present.length;
      });
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
    try { await api.deleteAttendance(id); await load(); }
    catch (e) { alert('Could not delete: ' + e.message); }
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
      background: 'var(--card)', borderRadius: 16, padding: '20px 24px',
      border: `2px solid ${color}30`, textAlign: 'center', flex: 1,
      transition: 'transform 0.2s, box-shadow 0.2s',
    }} className="hover-lift">
      <div style={{ fontSize: 32, marginBottom: 6 }}>{icon}</div>
      <div id={label.includes('Present') ? 'present-counter' : undefined}
        style={{ fontSize: 44, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 600, marginTop: 6 }}>{label}</div>
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text3)' }}>Loading…</div>;

  return (
    <div>
      {showQR && <QRModal url={appUrl} onClose={() => setShowQR(false)} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 22, color: 'var(--text)' }}>Attendance Dashboard</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowQR(true)} className="ripple-btn" style={{
            padding: '10px 20px', borderRadius: 12, border: 'none',
            background: '#3A8C6E', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>📱 QR Code for Parents</button>
          <button onClick={clearTodayTimeline} disabled={clearing || today.length === 0} style={{
            padding: '10px 20px', borderRadius: 12, border: '2px solid #E8734A',
            background: 'var(--card)', color: '#E8734A', fontWeight: 700, fontSize: 14,
            cursor: today.length === 0 ? 'not-allowed' : 'pointer',
            opacity: today.length === 0 ? 0.5 : 1,
          }}>{clearing ? 'Clearing...' : '🗑️ Clear Today'}</button>
        </div>
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>
        {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        {' · '}Auto-refreshes every 30s
      </p>
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Currently Present" value={presentCount} color="#5BAD5B" icon="✅" />
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
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 12 }}>
                    <Avatar child={c} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{c.name}</div>
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
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: 'var(--bg)', borderRadius: 12 }}>
                    <Avatar child={c} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{c.name}</div>
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
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Today's Timeline</h3>
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
                        <span style={{ fontWeight: 700, color: 'var(--text)' }}>{r.name || '?'}</span>
                        <span style={{ color: 'var(--text2)', fontSize: 14 }}>
                          {' '}{isCheckIn ? 'checked in' : 'checked out'}{' at '}
                          <strong>{fmt(isCheckIn ? r.check_in : r.check_out)}</strong>
                        </span>
                        {r.who && <span style={{ color: 'var(--text3)', fontSize: 13 }}> · {r.who}</span>}
                      </div>
                      <button onClick={() => deleteRecord(r.id)}
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
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
                <Avatar child={c} size={30} />
                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{c.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'children',  label: '👶 Children' },
  { id: 'staff',     label: '👤 Staff' },
  { id: 'history',   label: '📅 History' },
  { id: 'logs',      label: '📋 Daily Logs' },
  { id: 'transitions', label: '🎓 Transitions' },
];

export default function AdminView({ onBack }) {
  const [tab, setTab] = useState('dashboard');
  const user = api.getCurrentUser();

  // Dark mode
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleLogout = () => { api.logout(); window.location.reload(); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--card)', borderBottom: '2px solid var(--border)',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60, position: 'sticky', top: 0, zIndex: 100,
        transition: 'background 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{APP_EMOJI}</span>
          <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--text)' }}>{APP_SHORT} Admin</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Dark mode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{dark ? '🌙' : '☀️'}</span>
            <div className="theme-toggle" onClick={() => setDark(d => !d)} />
          </div>
          {user && <span style={{ fontSize: 14, color: 'var(--text2)' }}>👋 {user.name || user.username}</span>}
          <button onClick={onBack} style={{
            padding: '8px 16px', borderRadius: 10, border: '2px solid var(--border)',
            background: 'var(--card)', fontWeight: 700, fontSize: 14, cursor: 'pointer', color: 'var(--text)',
          }}>🏠 Kiosk View</button>
          <button onClick={handleLogout} className="ripple-btn" style={{
            padding: '8px 16px', borderRadius: 10, border: 'none',
            background: '#E8734A', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>Sign Out</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
  background: 'var(--card)', borderBottom: '2px solid var(--border)',
  padding: '0 24px', display: 'flex', gap: 4, overflowX: 'auto',
  transition: 'background 0.3s',
}}>
  {TABS.map(t => (
    <button key={t.id} onClick={() => setTab(t.id)} style={{
      padding: '14px 20px', border: 'none', background: 'none',
      fontFamily: 'Nunito', fontWeight: 700, fontSize: 14, cursor: 'pointer',
      color: tab === t.id ? '#3A8C6E' : 'var(--text2)',
      borderBottom: tab === t.id ? '3px solid #3A8C6E' : '3px solid transparent',
      whiteSpace: 'nowrap', transition: 'all 0.15s',
    }}>{t.label}</button>
  ))}
</div>

      {/* Content */}
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'children'  && <ChildrenManager />}
        {tab === 'staff'     && <StaffManager />}
        {tab === 'history'   && <AttendanceHistory />}
        {tab === 'logs'      && <DailyLogs />}
        {tab === 'transitions' && <Transitions />}
      </div>
    </div>
  );
}
