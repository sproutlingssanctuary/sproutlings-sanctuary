import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Card, EmptyState, Btn, SectionTitle } from './UI';
import * as api from '../utils/api';
import { APP_SHORT } from '../config';
import ChildrenManager from './ChildrenManager';
import StaffManager from './StaffManager';
import AttendanceHistory from './AttendanceHistory';
import DailyLogs from './DailyLogs';
import Transitions from './Transitions';

function fmt(ts) {
  if (!ts) return '—';
  const ms = Number(ts);
  if (isNaN(ms) || ms <= 0) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function duration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const ms1 = Number(checkIn);
  const ms2 = Number(checkOut);
  if (isNaN(ms1) || isNaN(ms2) || ms2 <= ms1) return null;
  const mins = Math.round((ms2 - ms1) / 60000);
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
        borderRadius: 'var(--radius)', padding: 40, maxWidth: 420, width: '90%',
        textAlign: 'center', boxShadow: 'var(--shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Parent Check-In QR Code</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, fontWeight: 500 }}>
          Parents scan this to open the check-in kiosk on their phone
        </p>
        <img src={qrUrl} alt="QR" style={{ width: 250, height: 250, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', marginBottom: 20 }} />
        <div style={{
          background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 16px',
          fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all', marginBottom: 24, fontWeight: 500,
        }}>{url}</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button onClick={() => window.print()} className="ripple-btn btn-glow" style={{
            padding: '12px 24px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer',
          }}>Print QR Code</button>
          <button onClick={onClose} style={{
            padding: '12px 24px', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'var(--bg-elevated)',
            fontWeight: 800, fontSize: 14, cursor: 'pointer', color: 'var(--text-secondary)',
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

  const StatCard = ({ label, value, color, sub }) => (
    <div className="card-premium hover-lift" style={{ padding: '24px 20px', textAlign: 'center', flex: 1, borderTop: `3px solid ${color}` }}>
      <div id={sub ? 'present-counter' : undefined} style={{ fontSize: 40, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 700, marginTop: 8, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)', fontWeight: 600 }}>Loading</div>;

  return (
    <div>
      {showQR && <QRModal url={appUrl} onClose={() => setShowQR(false)} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 22, color: 'var(--text)', fontWeight: 900, letterSpacing: -0.5 }}>Attendance Dashboard</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setShowQR(true)} className="ripple-btn btn-glow" style={{
            padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--primary)', color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer',
          }}>QR Code for Parents</button>
          <button onClick={clearTodayTimeline} disabled={clearing || today.length === 0} style={{
            padding: '10px 20px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--danger)',
            background: 'var(--bg-elevated)', color: 'var(--danger)', fontWeight: 800, fontSize: 13,
            cursor: today.length === 0 ? 'not-allowed' : 'pointer',
            opacity: today.length === 0 ? 0.5 : 1,
          }}>{clearing ? 'Clearing...' : 'Clear Today'}</button>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24, fontWeight: 500 }}>
        {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        <span style={{ margin: '0 8px', color: 'var(--border-strong)' }}>|</span>
        Auto-refreshes every 30s
      </p>
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Currently Present" value={presentCount} color="#2D7A5F" sub />
        <StatCard label="Checked Out" value={checkedOut.length} color="#D65A4A" />
        <StatCard label="Not Arrived" value={notArrived.length} color="#8BA89A" />
        <StatCard label="Total Enrolled" value={children.length} color="#3D9A7A" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card style={{ borderTop: '3px solid #2D7A5F' }}>
          <h3 style={{ fontSize: 14, color: '#2D7A5F', marginBottom: 16, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase' }}>Currently Here ({checkedIn.length})</h3>
          {checkedIn.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>No children present yet.</p>
            : checkedIn.map(c => {
                const rec = [...today.filter(r => r.child_id === c.id)].sort((a,b)=>(Number(b.check_in)||0)-(Number(a.check_in)||0))[0];
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                    <Avatar child={c} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>In: {fmt(rec?.check_in)}{rec?.who ? ` · ${rec.who}` : ''}</div>
                    </div>
                    {c.notes && <div title={c.notes} style={{ fontSize: 16, cursor: 'help', color: 'var(--accent)' }}>!</div>}
                  </div>
                );
              })
          }
        </Card>
        <Card style={{ borderTop: '3px solid #D65A4A' }}>
          <h3 style={{ fontSize: 14, color: '#D65A4A', marginBottom: 16, fontWeight: 900, letterSpacing: 0.5, textTransform: 'uppercase' }}>Went Home ({checkedOut.length})</h3>
          {checkedOut.length === 0
            ? <p style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>No departures yet today.</p>
            : checkedOut.map(c => {
                const recs = today.filter(r => r.child_id === c.id);
                const lastOut = [...recs].filter(r => r.check_out).sort((a,b)=>Number(b.check_out)-Number(a.check_out))[0];
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '12px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                    <Avatar child={c} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {fmt(lastOut?.check_in)} → {fmt(lastOut?.check_out)}
                        {lastOut?.check_in && lastOut?.check_out && (
                          <span style={{ marginLeft: 6, background: 'rgba(232,168,56,0.1)', color: '#B07820', padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 800 }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: 'var(--text)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Today's Timeline</h3>
          {today.length > 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Click X to delete</span>}
        </div>
        {today.length === 0
          ? <EmptyState icon="-" message="No activity recorded today yet." />
          : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {[...today]
                .sort((a, b) => Math.max(Number(b.check_in)||0, Number(b.check_out)||0) - Math.max(Number(a.check_in)||0, Number(a.check_out)||0))
                .map((r, i) => {
                  const c = children.find(ch => ch.id === r.child_id);
                  const isCheckIn = r.check_in && !r.check_out;
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isCheckIn ? '#2D7A5F' : '#D65A4A' }} />
                      {c && <Avatar child={c} size={30} />}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 800, color: 'var(--text)', fontSize: 14 }}>{r.name || '?'}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 14, fontWeight: 500 }}>
                          {' '}{isCheckIn ? 'checked in' : 'checked out'}{' at '}
                          <strong>{fmt(isCheckIn ? r.check_in : r.check_out)}</strong>
                        </span>
                        {r.who && <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}> · {r.who}</span>}
                      </div>
                      <button onClick={() => deleteRecord(r.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--border-strong)', fontSize: 14, padding: '4px 8px', borderRadius: 6, fontWeight: 800 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--border-strong)'}
                      >X</button>
                    </div>
                  );
                })}
            </div>
          )
        }
      </Card>
      {notArrived.length > 0 && (
        <Card style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 14, marginBottom: 16, fontWeight: 900, color: 'var(--text-secondary)', letterSpacing: 0.5, textTransform: 'uppercase' }}>Not Arrived Yet ({notArrived.length})</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {notArrived.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <Avatar child={c} size={30} />
                <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{c.name}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'children',  label: 'Children' },
  { id: 'staff',     label: 'Staff' },
  { id: 'history',   label: 'History' },
  { id: 'logs',      label: 'Daily Logs' },
  { id: 'transitions', label: 'Transitions' },
];

export default function AdminView({ onBack }) {
  const [tab, setTab] = useState('dashboard');
  const user = api.getCurrentUser();

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleLogout = () => { api.logout(); window.location.reload(); };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.4s ease' }}>
      {/* Top bar */}
      <div style={{
        background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        padding: '0 28px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, var(--primary), var(--primary-light))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: 16,
          }}>
            S
          </div>
          <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', letterSpacing: -0.3 }}>
            {APP_SHORT}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
              {dark ? 'Dark' : 'Light'}
            </span>
            <div className="theme-toggle" onClick={() => setDark(d => !d)} />
          </div>
          {user && <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{user.name || user.username}</span>}
          <button onClick={onBack} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-sm)',
            border: '1.5px solid var(--border)', background: 'transparent',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)',
            transition: 'all 0.2s', fontFamily: 'var(--font)',
          }}>
            Kiosk View
          </button>
          <button onClick={handleLogout} className="ripple-btn" style={{
            padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--danger)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            fontFamily: 'var(--font)',
          }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)',
        padding: '0 28px', display: 'flex', gap: 4, overflowX: 'auto',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={tab === t.id ? 'admin-tab active' : 'admin-tab'}
          >{t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>
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
