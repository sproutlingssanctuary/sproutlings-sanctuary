import React, { useState } from 'react';

// ─── Avatar ──────────────────────────────────────────────────────────────────
export function Avatar({ child, size = 52 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: child.color + '22',
      border: `3px solid ${child.color}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 900, fontSize: size * 0.3, color: child.color,
      flexShrink: 0, userSelect: 'none',
    }}>
      {child.initials}
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────────────────
const VARIANT_STYLES = {
  primary:  { background: '#3A8C6E', color: '#fff', border: 'none' },
  success:  { background: '#5BAD5B', color: '#fff', border: 'none' },
  danger:   { background: '#E8734A', color: '#fff', border: 'none' },
  warning:  { background: '#E8A94A', color: '#fff', border: 'none' },
  ghost:    { background: 'transparent', border: '2px solid var(--border)', color: 'var(--text2)' },
  lavender: { background: '#7B9E6B', color: '#fff', border: 'none' },
};
const SIZE_STYLES = {
  sm: { padding: '8px 16px', fontSize: 14 },
  md: { padding: '12px 22px', fontSize: 16 },
  lg: { padding: '16px 30px', fontSize: 18 },
  xl: { padding: '20px 40px', fontSize: 22 },
};

export function Btn({ onClick, children, variant = 'primary', size = 'md', disabled = false, full = false, style = {} }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{
        borderRadius: 12, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1, transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: full ? '100%' : 'auto',
        ...SIZE_STYLES[size],
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, width = 480 }) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div className="slide-up" style={{
        background: '#fff', borderRadius: 20, padding: 28,
        width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 20 }}>{title}</h2>
          <button onClick={onClose} style={{
            background: '#f1f5f9', border: 'none', borderRadius: 8,
            width: 32, height: 32, fontSize: 20, cursor: 'pointer', color: 'var(--text2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Form Field ──────────────────────────────────────────────────────────────
export function Field({ label, children, required }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#FF6B6B' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

// ─── PIN Pad ─────────────────────────────────────────────────────────────────
export function PinPad({ onSubmit, onCancel, label = 'Enter PIN', maxLen = 6 }) {
  const [pin, setPin] = useState('');

  const add = (d) => setPin(p => p.length < maxLen ? p + d : p);
  const del = () => setPin(p => p.slice(0, -1));

  const dots = Array.from({ length: maxLen }, (_, i) => (
    <div key={i} style={{
      width: 14, height: 14, borderRadius: '50%',
      background: i < pin.length ? '#4A90D9' : '#e2e8f0',
      transition: 'background 0.15s',
    }} />
  ));

  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ marginBottom: 16, color: 'var(--text2)', fontSize: 16 }}>{label}</p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 24 }}>
        {dots}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxWidth: 280, margin: '0 auto 20px' }}>
        {keys.map((k, i) => (
          <button
            key={i}
            onClick={() => typeof k === 'number' ? add(String(k)) : k === '⌫' ? del() : null}
            style={{
              padding: '18px 0', fontSize: 22, fontWeight: 700, borderRadius: 12,
              border: '2px solid var(--border)', background: k === '' ? 'transparent' : '#fff',
              cursor: k === '' ? 'default' : 'pointer', fontFamily: 'Nunito',
              color: 'var(--text)', opacity: k === '' ? 0 : 1,
              transition: 'background 0.1s',
            }}
            onMouseDown={e => { if (k !== '') e.currentTarget.style.background = '#f1f5f9'; }}
            onMouseUp={e => { e.currentTarget.style.background = '#fff'; }}
          >
            {k}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <Btn onClick={onCancel} variant="ghost">Cancel</Btn>
        <Btn onClick={() => onSubmit(pin)} variant="primary" disabled={pin.length === 0}>Confirm</Btn>
      </div>
    </div>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
export function Badge({ label, color = '#4A90D9' }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      background: color + '22', color, fontSize: 12, fontWeight: 700,
    }}>
      {label}
    </span>
  );
}

// ─── Toast ───────────────────────────────────────────────────────────────────
export function Toast({ msg, color }) {
  const bg = { grass: '#5BAD5B', coral: '#FF6B6B', sky: '#4A90D9', sun: '#FFB800' };
  return (
    <div className="fade-in" style={{
      background: bg[color] || color, color: '#fff', borderRadius: 14,
      padding: '14px 24px', textAlign: 'center', fontSize: 18,
      fontWeight: 700, marginBottom: 16, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    }}>
      {msg}
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text3)' }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ fontSize: 16 }}>{message}</p>
    </div>
  );
}

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '20px',
      border: '2px solid var(--border)', ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Section Title ────────────────────────────────────────────────────────────
export function SectionTitle({ children, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
      <h2 style={{ fontSize: 22 }}>{children}</h2>
      {action}
    </div>
  );
}
