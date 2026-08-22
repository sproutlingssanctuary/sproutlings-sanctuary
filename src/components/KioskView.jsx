import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, PinPad, Toast } from './UI';
import * as api from '../utils/api';
import { APP_NAME } from '../config';
import { launchConfetti } from '../utils/confetti';
import { playCheckIn, playCheckOut, playError } from '../utils/sounds';
import { calcAgeDisplay, isBirthdayToday } from '../utils/age';

function fmt(ts) {
  if (!ts) return '—';
  const ms = Number(ts);
  if (isNaN(ms) || ms <= 0) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function KioskView({ onAdminAccess }) {
  const [children, setChildren] = useState([]);
  const [todayRecs, setTodayRecs] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('list');
  const [who, setWho] = useState('');
  const [pinMode, setPinMode] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState('');

  const load = useCallback(async () => {
    try {
      const [kids, recs] = await Promise.all([api.getChildrenKiosk(), api.getToday()]);
      setChildren(kids);
      setTodayRecs(recs);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const isIn = (child) => {
    const recs = todayRecs.filter(r => r.child_id === child.id);
    if (!recs.length) return false;
    const last = [...recs].sort((a, b) => (b.check_in || 0) - (a.check_in || 0))[0];
    return last.check_in && !last.check_out;
  };

  const showToast = (msg, color, duration = 3000) => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), duration);
  };

  const handleSelect = (child) => {
    setSelected(child); setWho(''); setSignature(''); setStep('action');
  };

  const handleAction = (type) => {
    if (!who.trim()) { showToast('Please enter who is dropping off / picking up', 'coral'); return; }
    if (selected.pin) { setPinMode(type); setStep('pin'); }
    else { setPinMode(type); setStep('signature'); }
  };

  const finalize = async (type, pin) => {
    if (selected.pin && pin !== undefined) {
      try {
        const { valid } = await api.verifyPin(selected.id, pin);
        if (!valid) {
          playError();
          showToast('Wrong PIN — try again', 'coral');
          setStep('action'); setPinMode(null); return;
        }
      } catch {
        playError();
        showToast('Error verifying PIN', 'coral'); return;
      }
    }

    setLoading(true);
    try {
      if (type === 'in') {
        await api.checkIn(selected.id, who);
        playCheckIn();
        launchConfetti();
        showToast(`${selected.name} checked in! Signed by ${who}`, 'grass');
      } else {
        await api.checkOut(selected.id, who);
        playCheckOut();
        showToast(`${selected.name} checked out! Signed by ${who}`, 'coral');
      }
      await load();
    } catch (e) {
      playError();
      showToast(e.message, 'coral');
    } finally {
      setLoading(false); setStep('list'); setSelected(null);
      setWho(''); setSignature(''); setPinMode(null);
    }
  };

  const handleSignature = () => {
    if (!signature.trim()) { showToast('Please type your full name as signature', 'coral'); return; }
    finalize(pinMode, null);
  };

  const filtered = children.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
  const presentCount = children.filter(c => isIn(c)).length;

  return (
    <div className="kiosk-bg" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
            {APP_NAME}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)', letterSpacing: -1, lineHeight: 1.2 }}>
            {timeGreeting()}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 8, fontWeight: 500 }}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {presentCount > 0 && (
              <span className="count-pulse" style={{
                marginLeft: 14, background: 'var(--primary)', color: '#fff',
                padding: '4px 14px', borderRadius: 100, fontWeight: 800, fontSize: 12,
                letterSpacing: 0.5,
              }}>
                {presentCount} Present
              </span>
            )}
          </p>
        </div>

        {toast && <Toast msg={toast.msg} color={toast.color} />}

        {/* Child List */}
        {step === 'list' && (
          <>
            <div style={{ marginBottom: 20 }}>
              <input
                placeholder="Search child name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  fontSize: 16, padding: '16px 20px', borderRadius: 'var(--radius)',
                  border: '1.5px solid var(--border)', width: '100%', background: 'var(--bg-elevated)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              />
            </div>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24,
            }}>
              {filtered.map(child => {
                const checked = isIn(child);
                const rec = todayRecs.filter(r => r.child_id === child.id).sort((a,b)=>(b.check_in||0)-(a.check_in||0))[0];
                const birthday = isBirthdayToday(child.dob);
                const displayAge = calcAgeDisplay(child.dob, child.age);
                return (
                  <button key={child.id} onClick={() => handleSelect(child)} className="hover-lift"
                    style={{
                      background: birthday ? 'linear-gradient(135deg, rgba(232,168,56,0.08), var(--bg-elevated))' : 'var(--bg-elevated)',
                      borderRadius: 'var(--radius)',
                      border: `2px solid ${checked ? 'var(--primary)' : birthday ? 'var(--accent)' : 'var(--border)'}`,
                      padding: '20px', display: 'flex', alignItems: 'center', gap: 14,
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                      boxShadow: checked ? '0 0 0 3px var(--primary-glow)' : birthday ? '0 4px 20px var(--accent-glow)' : 'var(--shadow)',
                    }}
                  >
                    <div style={{ position: 'relative' }}>
                      <Avatar child={child} size={52} />
                      {birthday && <div className="birthday-glow" style={{
                        position: 'absolute', inset: -3, borderRadius: '50%',
                        border: '2px solid var(--accent)',
                      }} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)' }}>{child.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 500 }}>{displayAge}</div>
                      {birthday && (
                        <div className="badge" style={{ background: 'var(--accent-glow)', color: '#B07820', marginBottom: 4 }}>
                          Happy Birthday
                        </div>
                      )}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '4px 12px', borderRadius: 100,
                        background: checked ? 'var(--primary-glow)' : 'var(--bg)',
                        color: checked ? 'var(--primary)' : 'var(--text-muted)',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {checked
                          ? `In since ${fmt(rec?.check_in)}`
                          : 'Not checked in'
                        }
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Action Screen */}
        {step === 'action' && selected && (
          <div className="slide-up glass" style={{
            borderRadius: 'var(--radius)', padding: 40,
            maxWidth: 440, margin: '0 auto', textAlign: 'center',
          }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Avatar child={selected} size={80} />
              {isBirthdayToday(selected.dob) && <div className="birthday-glow" style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '2px solid var(--accent)',
              }} />}
            </div>
            <h2 style={{ marginTop: 16, fontSize: 26, fontWeight: 900 }}>{selected.name}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 500 }}>
              {calcAgeDisplay(selected.dob, selected.age)}
            </p>
            {isBirthdayToday(selected.dob) && (
              <div className="badge" style={{ background: 'var(--accent-glow)', color: '#B07820', margin: '8px 0' }}>
                Happy Birthday
              </div>
            )}
            {selected.notes && (
              <div style={{
                background: 'rgba(232,168,56,0.08)', border: '1px solid var(--accent-glow)',
                borderRadius: 'var(--radius-sm)', padding: '12px 16px', margin: '14px 0',
                fontSize: 14, color: '#B07820', textAlign: 'left', lineHeight: 1.5, fontWeight: 500,
              }}>
                {selected.notes}
              </div>
            )}
            <div style={{ margin: '20px 0' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, textAlign: 'left', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Dropped off / picked up by <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                placeholder="Full name required"
                value={who}
                onChange={e => setWho(e.target.value)}
                style={{ textAlign: 'center', fontSize: 16, borderRadius: 'var(--radius-sm)', width: '100%', padding: '14px 16px' }}
              />
            </div>

            {!isIn(selected) ? (
              <button onClick={() => handleAction('in')} disabled={loading} className="checkin-btn ripple-btn">
                {loading ? 'Processing...' : 'Check In'}
              </button>
            ) : (
              <button onClick={() => handleAction('out')} disabled={loading} className="checkout-btn ripple-btn">
                {loading ? 'Processing...' : 'Check Out'}
              </button>
            )}

            <button onClick={() => { setStep('list'); setSelected(null); }}
              style={{
                marginTop: 14, background: 'transparent', border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '12px 24px',
                fontFamily: 'var(--font)', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', color: 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              Back to List
            </button>
          </div>
        )}

        {/* Signature Screen */}
        {step === 'signature' && selected && (
          <div className="slide-up glass" style={{
            borderRadius: 'var(--radius)', padding: 40,
            maxWidth: 440, margin: '0 auto', textAlign: 'center',
          }}>
            <div style={{ fontSize: 40, marginBottom: 12, color: 'var(--primary)' }}>✍</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>Signature Required</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, fontWeight: 500 }}>
              Type your full name to confirm {pinMode === 'in' ? 'drop-off' : 'pick-up'} of <strong>{selected.name}</strong>
            </p>
            <input
              placeholder="Type your full name..."
              value={signature}
              onChange={e => setSignature(e.target.value)}
              style={{
                width: '100%', fontSize: 18, padding: '16px 20px',
                borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)',
                fontFamily: 'cursive', textAlign: 'center', marginBottom: 20,
              }}
              autoFocus
            />
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Confirming</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{who} is {pinMode === 'in' ? 'dropping off' : 'picking up'} {selected.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{new Date().toLocaleString()}</div>
            </div>
            <button onClick={handleSignature} disabled={loading || !signature.trim()} className="checkin-btn ripple-btn"
              style={{
                background: !signature.trim() || loading ? 'var(--border)' : pinMode === 'in' ? 'linear-gradient(135deg, #2D7A5F, #3D9A7A)' : 'linear-gradient(135deg, #D65A4A, #E87868)',
                marginBottom: 12,
              }}
            >
              Confirm & {pinMode === 'in' ? 'Check In' : 'Check Out'}
            </button>
            <button onClick={() => { setStep('action'); setPinMode(null); }}
              style={{
                background: 'transparent', border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-sm)', padding: '12px 24px',
                fontFamily: 'var(--font)', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', color: 'var(--text-secondary)',
              }}
            >
              Back
            </button>
          </div>
        )}

        {/* PIN Entry */}
        {step === 'pin' && selected && (
          <div className="slide-up glass" style={{
            borderRadius: 'var(--radius)', padding: 40,
            maxWidth: 380, margin: '0 auto',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar child={selected} size={60} />
              <h2 style={{ marginTop: 12, fontSize: 20, fontWeight: 900 }}>{selected.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4, fontWeight: 500 }}>
                {who} is {pinMode === 'in' ? 'dropping off' : 'picking up'}
              </p>
            </div>
            <PinPad
              label={`Enter PIN to check ${pinMode}`}
              onSubmit={(pin) => finalize(pinMode, pin)}
              onCancel={() => { setStep('action'); setPinMode(null); }}
            />
          </div>
        )}

        {/* Footer */}
        {step === 'list' && (
          <div style={{ textAlign: 'center', marginTop: 16, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>Staff access? </span>
            <button onClick={onAdminAccess}
              style={{
                background: 'none', border: 'none', color: 'var(--primary)',
                fontFamily: 'var(--font)', fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}
            >
              Admin Panel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
