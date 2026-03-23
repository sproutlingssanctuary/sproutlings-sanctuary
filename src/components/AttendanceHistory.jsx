import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Btn, SectionTitle, EmptyState } from './UI';
import * as api from '../utils/api';

function fmt(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function duration(checkIn, checkOut) {
  if (!checkIn || !checkOut) return null;
  const mins = Math.round((checkOut - checkIn) / 60000);
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

  const checkinRecs = records.filter(r => r.check_in);

  return (
    <div>
      <SectionTitle action={
        <Btn onClick={doExport} variant="success">⬇ Export CSV</Btn>
      }>
        Attendance History
      </SectionTitle>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>CHILD</label>
          <select value={filterChild} onKeyDown={e=>e.stopPropagation()} onChange={e => setFilterChild(e.target.value)}>
            <option value="">All Children</option>
            {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>FROM DATE</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        </div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>TO DATE</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
        {(filterChild || dateFrom || dateTo) && (
          <Btn onClick={() => { setFilterChild(''); setDateFrom(''); setDateTo(''); }} variant="ghost" size="sm">Clear</Btn>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading…</div>}

      {!loading && checkinRecs.length === 0 && (
        <EmptyState icon="📅" message="No attendance records found for these filters." />
      )}

      {!loading && checkinRecs.length > 0 && (
        <>
          <div style={{
            background: '#fff', borderRadius: 16, border: '2px solid var(--border)', overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1.5fr 2fr',
              padding: '12px 18px',
              fontSize: 12, fontWeight: 800, color: 'var(--text3)',
              textTransform: 'uppercase', letterSpacing: 0.8,
              borderBottom: '2px solid var(--border)',
              background: '#f9fafb',
            }}>
              <span>Child</span>
              <span>Date</span>
              <span>Check In</span>
              <span>Check Out</span>
              <span>Duration</span>
              <span>Dropped off / Picked up</span>
            </div>

            {/* Rows */}
            {checkinRecs.map((r, i) => {
              const child = children.find(c => c.id === r.child_id);
              const dur = duration(r.check_in, r.check_out);
              return (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1.5fr 2fr',
                  padding: '12px 18px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                  background: i % 2 === 0 ? '#fff' : '#fafbfc',
                  fontSize: 14,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {child
                      ? <Avatar child={child} size={30} />
                      : <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#eee' }} />
                    }
                    <span style={{ fontWeight: 700 }}>{r.name || '?'}</span>
                  </div>
                  <span style={{ color: 'var(--text2)' }}>{r.date}</span>
                  <span style={{ color: '#5BAD5B', fontWeight: 700 }}>{fmt(r.check_in)}</span>
                  <span style={{ color: r.check_out ? '#E8734A' : 'var(--text3)', fontWeight: r.check_out ? 700 : 400 }}>
                    {r.check_out ? fmt(r.check_out) : <span style={{ animation: 'pulse 2s infinite' }}>● Still in</span>}
                  </span>
                  <span>
                    {dur
                      ? <span style={{ background: '#FFB80022', color: '#CC8800', padding: '2px 10px', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>{dur}</span>
                      : <span style={{ color: 'var(--text3)' }}>—</span>
                    }
                  </span>
                  <span style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.who || <span style={{ color: 'var(--text3)' }}>—</span>}
                  </span>
                </div>
              );
            })}
          </div>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 12, textAlign: 'right' }}>
            Showing {checkinRecs.length} records
          </p>
        </>
      )}
    </div>
  );
}
