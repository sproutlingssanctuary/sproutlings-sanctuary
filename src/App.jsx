import React, { useState } from 'react'
import KioskView from './components/KioskView'
import AdminView from './components/AdminView'
import { getCurrentUser, login } from './utils/api'

function LoginScreen({ onLogin }) {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async () => {
    if (!username || !password) { setError('Please enter username and password'); return; }
    setLoading(true); setError('');
    try {
      await login(username, password);
      onLogin();
    } catch(e) {
      setError('Wrong username or password');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 40, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🌱</div>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>Sproutlings Admin</h1>
          <p style={{ color: '#888', fontSize: 14 }}>Staff login</p>
        </div>
        {error && <div style={{ background: '#FEE', color: '#C00', padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #eee', fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '2px solid #eee', fontSize: 15, marginBottom: 20, boxSizing: 'border-box' }}
        />
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: '#3A8C6E', color: '#fff', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('kiosk');
  const [authed, setAuthed] = useState(!!getCurrentUser());

  const handleAdminAccess = () => {
    if (getCurrentUser()) {
      setView('admin');
    } else {
      setView('login');
    }
  };

  if (view === 'kiosk') return <KioskView onAdminAccess={handleAdminAccess} />;
  if (view === 'login') return <LoginScreen onLogin={() => { setAuthed(true); setView('admin'); }} />;
  return <AdminView onBack={() => setView('kiosk')} />;
}
