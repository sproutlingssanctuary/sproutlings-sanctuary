import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Btn, SectionTitle, EmptyState, Modal, Field } from './UI';
import * as api from '../utils/api';

function fmt(ts) {
  if (!ts) return '—';
  const ms = Number(ts);
  if (isNaN(ms) || ms <= 0) return '—';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toInputTime(ts) {
  if (!ts) return '';
  const ms = Number(ts);
  if (isNaN(ms) || ms <= 0) return '';
  const d = new Date(ms);
  return d.toTimeString().slice(0, 5);
}

function fromInputTime(timeStr, baseDate) {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h, m, 0, 0);
  return d.getTime();
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

export default function AttendanceHistory() {
  const [children, setChildren] = useState([]);
  const [records, setRecords]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filterChild, setFilterChild] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');

  const [editRecord, setEditRecord] = useState(null);
  const [editIn, setEditIn] = useState('');
  const [editOut, setEditOut] = useState('');
  const [editWho, setEditWho] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 500 };
      if (filterChild) params.child_id = filterChild;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const [kids, recs] = await Promise.all([api.getChildrenFull(), api.getHistory(params)]);
      setChildren(kids);
      setRecords(recs);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterChild, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const doExport = () => {
    const params = {};
    if (filterChild) params.child_id = filterChild;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    api.exportCSV(params);
  };

  const openEdit = (r) => {
    setEditRecord(r);
    setEditIn(toInputTime(r.check_in));
    setEditOut(toInputTime(r.check_out));
    setEditWho(r.who || '');
  };

  const saveEdit = async () => {
    if (!editRecord) return;
    const baseDate = editRecord.date + 'T00:00:00';
    const checkIn = editIn ? fromInputTime(editIn, baseDate) : null;
    const checkOut = editOut ? fromInputTime(editOut, baseDate) : null;
    try {
      await api.updateAttendance(editRecord.id, { check_in: checkIn, check_out: checkOut, who: editWho });
      setEditRecord(null);
      await load();
    } catch (e) { alert('Error saving: ' + e.message); }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try { await api.deleteAttendance(id); await load(); }
    catch (e) { alert('Could not delete: ' + e.message); }
  };

  const checkinRecs = records.filter(r => r.check_in || r.absent);

  return (
    <div>
      <SectionTitle action={
        <Btn onClick={doExport} variant="success">Export CSV</Btn>
      }>
        Attendance History
      </SectionTitle>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>Child</label>
          <select value={filterChild} onKeyDown={e=>e.stopPropagation()} onChange={e => setFilterChild(e.target.value)}>
            <option value="">All Children</option>
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>From Date</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>To Date</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(filterChild || dateFrom || dateTo) && (
          <Btn onClick={() => { setFilterChild(''); setDateFrom(''); setDateTo(''); }} variant="ghost" size="sm">Clear</Btn>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontWeight: 600 }}>Loading</div>}

      {!loading && checkinRecs.length === 0 && (
        <EmptyState icon="-" message="No attendance records found for these filters." />
      )}

      {!loading && checkinRecs.length > 0 && (
        <>
          <div className="glass" style={{ borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.5fr 0.5fr',
              padding: '14px 20px',
              fontSize: 11, fontWeight: 800, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 1,
              borderBottom: '1px solid var(--border)',
              background: 'rgba(0,0,0,0.02)',
            }}>
              <span>Child</span>
              <span>Date</span>
              <span>Check In</span>
              <span>Check Out</span>
              <span>Duration</span>
              <span>By</span>
              <span></span>
            </div>

            {checkinRecs.map((r, i) => {
              const c = children.find(ch => ch.id === r.child_id);
              const isAbsent = r.absent === 1;
              const dur = duration(r.check_in, r.check_out);
              return (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.5fr 0.5fr',
                  padding: '12px 20px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)',
                  fontSize: 14, transition: 'background 0.15s',
                  opacity: isAbsent ? 0.7 : 1,
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(58,140,110,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {c ? <Avatar child={c} size={32} /> : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#eee' }} />}
                    <span style={{ fontWeight: 800 }}>{r.name || '?'}</span>
                    {isAbsent && <span className="badge" style={{ background: 'rgba(214,90,74,0.1)', color: 'var(--danger)', fontSize: 10 }}>Absent</span>}
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{r.date}</span>
                  <span style={{ color: isAbsent ? 'var(--danger)' : '#2D7A5F', fontWeight: 800, fontFamily: 'monospace', fontSize: 13 }}>
                    {isAbsent ? '—' : fmt(r.check_in)}
                  </span>
                  <span style={{ color: r.check_out ? '#D65A4A' : 'var(--text-muted)', fontWeight: r.check_out ? 800 : 500, fontFamily: 'monospace', fontSize: 13 }}>
                    {isAbsent ? '—' : r.check_out ? fmt(r.check_out) : <span style={{ animation: 'pulse 2s infinite' }}>Still in</span>}
                  </span>
                  <span>
                    {isAbsent ? (
                      <span style={{ color: 'var(--danger)', fontWeight: 800, fontSize: 12 }}>Absent</span>
                    ) : dur ? (
                      <span style={{ background: 'rgba(232,168,56,0.1)', color: '#B07820', padding: '3px 12px', borderRadius: 100, fontWeight: 800, fontSize: 12 }}>{dur}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {r.who || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {!isAbsent && (
                      <button onClick={() => openEdit(r)} title="Edit"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 4, borderRadius: 6, fontWeight: 800 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >Edit</button>
                    )}
                    <button onClick={() => deleteRecord(r.id)} title="Delete"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13, padding: 4, borderRadius: 6, fontWeight: 800 }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                    >X</button>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 14, textAlign: 'right', fontWeight: 600 }}>
            Showing {checkinRecs.length} records
          </p>
        </>
      )}

      {/* Edit Modal */}
      {editRecord && (
        <Modal title="Edit Attendance Record" onClose={() => setEditRecord(null)} width={420}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{editRecord.name}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 500 }}>{editRecord.date}</div>
          </div>
          <Field label="Check-In Time">
            <input type="time" value={editIn} onChange={e => setEditIn(e.target.value)} />
          </Field>
          <Field label="Check-Out Time">
            <input type="time" value={editOut} onChange={e => setEditOut(e.target.value)} />
          </Field>
          <Field label="Dropped off / Picked up by">
            <input value={editWho} onChange={e => setEditWho(e.target.value)} placeholder="Name" />
          </Field>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Btn onClick={() => setEditRecord(null)} variant="ghost" full>Cancel</Btn>
            <Btn onClick={saveEdit} variant="primary" full>Save Changes</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
