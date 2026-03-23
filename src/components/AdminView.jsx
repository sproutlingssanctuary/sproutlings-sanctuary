import React, { useState } from 'react';
import Dashboard from './Dashboard';
import ChildrenManager from './ChildrenManager';
import DailyLogs from './DailyLogs';
import AttendanceHistory from './AttendanceHistory';
import StaffManager from './StaffManager';
import { Btn } from './UI';
import * as api from '../utils/api';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'children',  label: '👶 Children'  },
  { id: 'logs',      label: '📝 Daily Logs' },
  { id: 'history',   label: '📅 History'    },
  { id: 'staff',     label: '👤 Staff'      },
];

export default function AdminView({ onBack }) {
  const [user, setUser]     = useState(api.getCurrentUser());
  const [tab, setTab]       = useState('dashboard');
  const [username, setU]    = useState('');
  const [password, setP]    = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const u = await api.login(username, password);
      setUser(u);
    } catch {
      setError('Incorrect username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setUser(null);
    setU(''); setP(''); setError('');
  };

  // ── Login Screen ──────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #E8F5EE 0%, #F2F7F4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div className="slide-up" style={{
          background: '#fff', borderRadius: 24, padding: 40, maxWidth: 380, width: '100%',
          boxShadow: '0 12px 48px rgba(0,0,0,0.12)', textAlign: 'center',
        }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Staff Login</h1>
          <p style={{ color: 'var(--text2)', marginBottom: 28, fontSize: 15 }}>
            Sproutlings Sanctuary Admin Panel
          </p>

          {error && (
            <div style={{
              background: '#FFE8E8', color: '#E8734A', borderRadius: 12,
              padding: '12px 16px', marginBottom: 16, fontSize: 14, fontWeight: 700,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              placeholder="Username"
              value={username}
              onChange={e => setU(e.target.value)}
              autoComplete="username"
              style={{ fontSize: 16, textAlign: 'left' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setP(e.target.value)}
              autoComplete="current-password"
              style={{ fontSize: 16, textAlign: 'left' }}
            />
            <button
              type="submit"
              disabled={loading || !username || !password}
              style={{
                padding: '14px', borderRadius: 12, border: 'none',
                background: loading ? '#ccc' : '#3A8C6E', color: '#fff',
                fontFamily: 'Nunito', fontWeight: 800, fontSize: 17, cursor: 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <button
              onClick={onBack}
              style={{ background: 'none', border: 'none', color: 'var(--sky)', fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}
            >
              ← Back to Kiosk
            </button>
          </div>

          <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>
            Default: admin / admin1234
          </p>
        </div>
      </div>
    );
  }

  // ── Admin Shell ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top Nav */}
      <div style={{
        background: '#fff', borderBottom: '2px solid var(--border)',
        display: 'flex', alignItems: 'center', padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 100,
        overflowX: 'auto',
      }}>
        <div style={{ padding: '16px 0', marginRight: 28, fontWeight: 900, fontSize: 20, flexShrink: 0, whiteSpace: 'nowrap' }}>
          🌱 Sproutlings
        </div>

        {TABS.filter(t => t.id !== 'staff' || user.role === 'admin').map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '18px 18px',
              border: 'none',
              borderBottom: tab === t.id ? '3px solid #3A8C6E' : '3px solid transparent',
              background: 'transparent',
              fontFamily: 'Nunito', fontWeight: 700, fontSize: 15,
              color: tab === t.id ? '#3A8C6E' : 'var(--text2)',
              cursor: 'pointer', flexShrink: 0, marginBottom: -2,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center', paddingLeft: 16, flexShrink: 0 }}>
          <span style={{ fontSize: 13, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
            👋 {user.username}
            {user.role === 'admin' && <span style={{ marginLeft: 4, color: '#CC8800', fontSize: 12 }}>⭐</span>}
          </span>
          <Btn onClick={onBack} variant="ghost" size="sm" style={{ whiteSpace: 'nowrap' }}>Kiosk View</Btn>
          <Btn onClick={handleLogout} variant="danger" size="sm" style={{ background: '#FFE8E8', color: '#E8734A', whiteSpace: 'nowrap' }}>Logout</Btn>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 24px', maxWidth: 1100, margin: '0 auto' }}>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'children'  && <ChildrenManager />}
        {tab === 'logs'      && <DailyLogs />}
        {tab === 'history'   && <AttendanceHistory />}
        {tab === 'staff' && user.role === 'admin' && <StaffManager currentUser={user} />}
      </div>
    </div>
  );
}
