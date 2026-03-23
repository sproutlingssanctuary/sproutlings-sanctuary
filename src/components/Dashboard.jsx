import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Card, EmptyState } from './UI';
import * as api from '../utils/api';

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function duration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const mins = Math.round((checkOut - checkIn) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Dashboard() {
  const [today, setToday]       = useState([]);
  const [children, setChildren] = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    try {
      const [recs, kids] = await Promise.all([api.getToday(), api.getChildrenFull()]);
      setToday(recs);
      setChildren(kids);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh every 30s
  useEffect(() => {
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const checkedIn  = children.filter(c => {
    const recs = today.filter(r => r.child_id === c.id);
    if (!recs.length) return false;
    const last = [...recs].sort((a,b)=>(b.check_in||0)-(a.check_in||0))[0];
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

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text3)' }}>Loading…</div>
  );

  return (
    <div>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>Attendance Dashboard</h2>
      <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 24 }}>
        {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        {' · '}Auto-refreshes every 30s
      </p>

      {/* Stats Row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' }}>
        <StatCard label="Currently Present" value={checkedIn.length} color="#5BAD5B" icon="✅" />
        <StatCard label="Checked Out" value={checkedOut.length} color="#E8734A" icon="🏠" />
        <StatCard label="Not Arrived" value={notArrived.length} color="#8A9AB0" icon="⏳" />
        <StatCard label="Total Enrolled" value={children.length} color="#3A8C6E" icon="👶" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Currently In */}
        <Card style={{ border: '2px solid #5BAD5B30' }}>
          <h3 style={{ fontSize: 16, color: '#5BAD5B', marginBottom: 14, fontWeight: 800 }}>
            ✓ Currently Here ({checkedIn.length})
          </h3>
          {checkedIn.length === 0
            ? <p style={{ color: 'var(--text3)', fontSize: 14 }}>No children present yet.</p>
            : checkedIn.map(c => {
                const rec = [...today.filter(r => r.child_id === c.id)].sort((a,b)=>(b.check_in||0)-(a.check_in||0))[0];
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                    padding: '10px 12px', background: '#f9fafb', borderRadius: 12,
                  }}>
                    <Avatar child={c} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        In: {fmt(rec?.check_in)}{rec?.who ? ` · ${rec.who}` : ''}
                      </div>
                    </div>
                    {c.notes && (
                      <div title={c.notes} style={{ fontSize: 16, cursor: 'help' }}>⚠️</div>
                    )}
                  </div>
                );
              })
          }
        </Card>

        {/* Checked Out */}
        <Card style={{ border: '2px solid #E8734A30' }}>
          <h3 style={{ fontSize: 16, color: '#E8734A', marginBottom: 14, fontWeight: 800 }}>
            → Went Home ({checkedOut.length})
          </h3>
          {checkedOut.length === 0
            ? <p style={{ color: 'var(--text3)', fontSize: 14 }}>No departures yet today.</p>
            : checkedOut.map(c => {
                const recs = today.filter(r => r.child_id === c.id);
                const lastOut = [...recs].filter(r => r.check_out).sort((a,b)=>b.check_out-a.check_out)[0];
                return (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                    padding: '10px 12px', background: '#f9fafb', borderRadius: 12,
                  }}>
                    <Avatar child={c} size={38} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {fmt(lastOut?.check_in)} → {fmt(lastOut?.check_out)}
                        {lastOut?.check_in && lastOut?.check_out &&
                          <span style={{ marginLeft: 6, background: '#E8A94A22', color: '#CC8800', padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                            {duration(lastOut.check_in, lastOut.check_out)}
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                );
              })
          }
        </Card>
      </div>

      {/* Today's Timeline */}
      <Card>
        <h3 style={{ fontSize: 16, marginBottom: 14, fontWeight: 800 }}>Today's Timeline</h3>
        {today.length === 0
          ? <EmptyState icon="📋" message="No activity recorded today yet." />
          : (
            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {[...today]
                .sort((a, b) => Math.max(b.check_in||0, b.check_out||0) - Math.max(a.check_in||0, a.check_out||0))
                .map((r, i) => {
                  const c = children.find(ch => ch.id === r.child_id);
                  const isCheckIn = r.check_in && !r.check_out;
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 0', borderBottom: '1px solid var(--border)',
                    }}>
                      <div style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        background: isCheckIn ? '#5BAD5B' : '#E8734A',
                      }} />
                      {c && <Avatar child={c} size={30} />}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700 }}>{r.name || '?'}</span>
                        <span style={{ color: 'var(--text2)', fontSize: 14 }}>
                          {' '}{isCheckIn ? 'checked in' : 'checked out'}
                          {' at '}
                          <strong>{fmt(isCheckIn ? r.check_in : r.check_out)}</strong>
                        </span>
                        {r.who && <span style={{ color: 'var(--text3)', fontSize: 13 }}> · {r.who}</span>}
                      </div>
                    </div>
                  );
                })}
            </div>
          )
        }
      </Card>

      {/* Not Arrived */}
      {notArrived.length > 0 && (
        <Card style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 14, fontWeight: 800, color: 'var(--text2)' }}>
            ⏳ Not Arrived Yet ({notArrived.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {notArrived.map(c => (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                background: '#f9fafb', borderRadius: 12, border: '1px solid var(--border)',
              }}>
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
