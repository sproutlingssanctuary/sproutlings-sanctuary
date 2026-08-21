import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, PinPad, Toast } from './UI';
import * as api from '../utils/api';

function fmt(ts) {
  if (!ts) return '—';
  const ms = Number(ts);
  if (isNaN(ms)) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calcAge(dob){
  if(!dob) return null;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if(m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

export default function KioskView({ onAdminAccess }) {
  const [children, setChildren]   = useState([]);
  const [todayRecs, setTodayRecs] = useState([]);
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [step, setStep]           = useState('list');
  const [who, setWho]             = useState('');
  const [pinMode, setPinMode]     = useState(null);
  const [toast, setToast]         = useState(null);
  const [loading, setLoading]     = useState(false);
  const [sigMode, setSigMode]     = useState(false);
  const [signature, setSignature] = useState('');

  const load = useCallback(async () => {
    try {
      const [kids, recs] = await Promise.all([
        api.getChildrenKiosk(),
        api.getToday()
      ]);
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
    setSelected(child);
    setWho('');
    setSignature('');
    setSigMode(false);
    setStep('action');
  };

  const handleAction = (type) => {
    if (!who.trim()) {
      showToast('Please enter who is dropping off / picking up', 'coral');
      return;
    }
    if (selected.pin) {
      setPinMode(type);
      setStep('pin');
    } else {
      setSigMode(true);
      setPinMode(type);
      setStep('signature');
    }
  };

  const finalize = async (type, pin) => {
    if (selected.pin && pin !== undefined) {
      try {
        const { valid } = await api.verifyPin(selected.id, pin);
        if (!valid) {
          showToast('❌ Wrong PIN — try again', 'coral');
          setStep('action');
          setPinMode(null);
          return;
        }
      } catch {
        showToast('❌ Error verifying PIN', 'coral');
        return;
      }
    }

    setLoading(true);
    try {
      if (type === 'in') {
        await api.checkIn(selected.id, who);
        showToast(`✓ ${selected.name} checked in! Signed by ${who}`, 'grass');
      } else {
        await api.checkOut(selected.id, who);
        showToast(`✓ ${selected.name} checked out! Signed by ${who}`, 'coral');
      }
      await load();
    } catch (e) {
      showToast(`❌ ${e.message}`, 'coral');
    } finally {
      setLoading(false);
      setStep('list');
      setSelected(null);
      setWho('');
      setSignature('');
      setSigMode(false);
      setPinMode(null);
    }
  };

  const handleSignature = () => {
    if (!signature.trim()) {
      showToast('Please type your full name as signature', 'coral');
      return;
    }
    finalize(pinMode, null);
  };

  const filtered = children.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const presentCount = children.filter(c => isIn(c)).length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #E8F5EE 0%, #F2F7F4 55%, #EEF4EB 100%)',
      padding: 24,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <div style={{ width: '100%', maxWidth: 720 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 52, marginBottom: 6, lineHeight: 1 }}>🌱</div>
          <h1 style={{ fontSize: 34, color: 'var(--text)', fontWeight: 900, letterSpacing: -1 }}>
            Sproutlings Sanctuary
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: 16, marginTop: 6 }}>
            {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {presentCount > 0 && (
              <span style={{ marginLeft: 12, background: '#5BAD5B22', color: '#5BAD5B', padding: '2px 12px', borderRadius: 20, fontWeight: 700, fontSize: 14 }}>
                {presentCount} child{presentCount !== 1 ? 'ren' : ''} present
              </span>
            )}
          </p>
        </div>

        {/* Toast */}
        {toast && <Toast msg={toast.msg} color={toast.color} />}

        {/* Child List */}
        {step === 'list' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <input
                placeholder="🔍  Search child name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ fontSize: 18, padding: '14px 18px', borderRadius: 14, border: '2px solid var(--border)', width: '100%' }}
              />
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
              gap: 12,
              marginBottom: 24,
            }}>
              {filtered.map(child => {
                const checked = isIn(child);
                const rec = todayRecs.filter(r => r.child_id === child.id).sort((a,b)=>(b.check_in||0)-(a.check_in||0))[0];
                const displayAge = child.dob ? calcAge(child.dob) : child.age;
                return (
                  <button
                    key={child.id}
                    onClick={() => handleSelect(child)}
                    style={{
                      background: '#fff',
                      borderRadius: 18,
                      border: `2px solid ${checked ? '#5BAD5B' : 'var(--border)'}`,
                      padding: '18px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      boxShadow: checked ? '0 0 0 4px #5BAD5B18' : 'var(--shadow)',
                      width: '100%',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = ''}
                  >
                    <Avatar child={child} size={52} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>{child.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 6 }}>Age {displayAge}</div>
                      <div style={{
                        display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                        background: checked ? '#5BAD5B22' : '#f1f5f9',
                        color: checked ? '#5BAD5B' : 'var(--text3)',
                        fontSize: 12, fontWeight: 700,
                      }}>
                        {checked
                          ? `✓ In since ${fmt(rec?.check_in)}`
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
          <div className="slide-up" style={{
            background: '#fff', borderRadius: 24, padding: 36,
            boxShadow: 'var(--shadow-md)', textAlign: 'center', maxWidth: 440, margin: '0 auto',
          }}>
            <Avatar child={selected} size={80} />
            <h2 style={{ marginTop: 16, fontSize: 28 }}>{selected.name}</h2>
            <p style={{ color: 'var(--text2)', marginBottom: 4 }}>
              Age {selected.dob ? calcAge(selected.dob) : selected.age}
            </p>

            {selected.notes && (
              <div style={{
                background: '#FFF9E6', border: '2px solid #FFB80040',
                borderRadius: 12, padding: '10px 16px', margin: '14px 0',
                fontSize: 14, color: '#CC8800', textAlign: 'left', lineHeight: 1.5,
              }}>
                ⚠️ {selected.notes}
              </div>
            )}

            <div style={{ margin: '16px 0' }}>
              <label style={{ display: 'block', fontWeight: 700, fontSize: 14, color: 'var(--text2)', marginBottom: 8, textAlign: 'left' }}>
                Dropped off / picked up by: <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                placeholder="Full name required..."
                value={who}
                onChange={e => setWho(e.target.value)}
                style={{ textAlign: 'center', fontSize: 16, borderRadius: 12, width: '100%', padding: '12px 16px', border: '2px solid var(--border)' }}
              />
            </div>

            {!isIn(selected) ? (
              <button
                onClick={() => handleAction('in')}
                disabled={loading}
                style={{
                  width: '100%', padding: '22px', borderRadius: 16,
                  background: loading ? '#ccc' : '#5BAD5B', color: '#fff',
                  fontWeight: 900, fontSize: 22, border: 'none', cursor: loading ? 'wait' : 'pointer',
                  marginBottom: 14, transition: 'all 0.15s',
                  boxShadow: '0 4px 16px rgba(91, 173, 91, 0.3)',
                }}
              >
                ✓ Check In
              </button>
            ) : (
              <button
                onClick={() => handleAction('out')}
                disabled={loading}
                style={{
                  width: '100%', padding: '22px', borderRadius: 16,
                  background: loading ? '#ccc' : '#E8734A', color: '#fff',
                  fontWeight: 900, fontSize: 22, border: 'none', cursor: loading ? 'wait' : 'pointer',
                  marginBottom: 14, transition: 'all 0.15s',
                  boxShadow: '0 4px 16px rgba(255, 107, 107, 0.3)',
                }}
              >
                → Check Out
              </button>
            )}

            <button
              onClick={() => { setStep('list'); setSelected(null); }}
              style={{
                background: 'transparent', border: '2px solid var(--border)', borderRadius: 12,
                padding: '12px 24px', fontFamily: 'Nunito', fontWeight: 700, fontSize: 16,
                cursor: 'pointer', color: 'var(--text2)',
              }}
            >
              ← Back to List
            </button>
          </div>
        )}

        {/* Signature Screen — for children without PIN */}
        {step === 'signature' && selected && (
          <div className="slide-up" style={{
            background: '#fff', borderRadius: 24, padding: 36,
            boxShadow: 'var(--shadow-md)', textAlign: 'center', maxWidth: 440, margin: '0 auto',
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✍️</div>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>Signature Required</h2>
            <p style={{ color: 'var(--text2)', fontSize: 15, marginBottom: 24 }}>
              Please type your full name to confirm {pinMode === 'in' ? 'drop-off' : 'pick-up'} of <strong>{selected.name}</strong>
            </p>
            <input
              placeholder="Type your full name..."
              value={signature}
              onChange={e => setSignature(e.target.value)}
              style={{
                width: '100%', fontSize: 18, padding: '14px 16px',
                borderRadius: 12, border: '2px solid var(--border)',
                fontFamily: 'cursive', textAlign: 'center', marginBottom: 20,
              }}
              autoFocus
            />
            <div style={{ background: '#f8f9fa', borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'left' }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>Confirming:</div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{who} is {pinMode === 'in' ? 'dropping off' : 'picking up'} {selected.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 4 }}>{new Date().toLocaleString()}</div>
            </div>
            <button
              onClick={handleSignature}
              disabled={loading || !signature.trim()}
              style={{
                width: '100%', padding: '18px', borderRadius: 14,
                background: !signature.trim() || loading ? '#ccc' : pinMode === 'in' ? '#5BAD5B' : '#E8734A',
                color: '#fff', fontWeight: 900, fontSize: 18,
                border: 'none', cursor: !signature.trim() || loading ? 'not-allowed' : 'pointer',
                marginBottom: 12,
              }}
            >
              ✓ Confirm & {pinMode === 'in' ? 'Check In' : 'Check Out'}
            </button>
            <button
              onClick={() => { setStep('action'); setSigMode(false); setPinMode(null); }}
              style={{
                background: 'transparent', border: '2px solid var(--border)', borderRadius: 12,
                padding: '12px 24px', fontFamily: 'Nunito', fontWeight: 700, fontSize: 16,
                cursor: 'pointer', color: 'var(--text2)',
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {/* PIN Entry */}
        {step === 'pin' && selected && (
          <div className="slide-up" style={{
            background: '#fff', borderRadius: 24, padding: 36,
            boxShadow: 'var(--shadow-md)', maxWidth: 380, margin: '0 auto',
          }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Avatar child={selected} size={56} />
              <h2 style={{ marginTop: 12, fontSize: 20 }}>{selected.name}</h2>
              <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>
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

        {/* Footer admin link */}
        {step === 'list' && (
          <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text3)', fontSize: 14 }}>Staff? </span>
            <button
              onClick={onAdminAccess}
              style={{
                background: 'none', border: 'none', color: 'var(--sky)',
                fontFamily: 'Nunito', fontWeight: 700, cursor: 'pointer', fontSize: 14,
              }}
            >
              Admin Panel →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
