import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Btn, Modal, Field, SectionTitle, EmptyState, Badge } from './UI';
import * as api from '../utils/api';

const LOG_TYPES = [
  { id: 'note',     label: 'Note',      emoji: '📝', color: '#3A8C6E' },
  { id: 'incident', label: 'Incident',  emoji: '⚠️', color: '#FF6B6B' },
  { id: 'injury',   label: 'Injury',    emoji: '🩹', color: '#FF9500' },
  { id: 'behavior', label: 'Behavior',  emoji: '💬', color: '#9B8EC4' },
  { id: 'meal',     label: 'Meal',      emoji: '🍽️', color: '#5BAD5B' },
  { id: 'nap',      label: 'Nap',       emoji: '😴', color: '#00BCD4' },
  { id: 'other',    label: 'Other',     emoji: '📌', color: '#8A9AB0' },
];

function todayKey() { return new Date().toISOString().slice(0, 10); }

function fmt(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(str) {
  const d = new Date(str + 'T12:00:00');
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function DailyLogs() {
  const [children, setChildren] = useState([]);
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterChild, setFilterChild] = useState('');
  const [form, setForm] = useState({ childId: '', type: 'note', note: '', date: todayKey() });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filterDate) params.date = filterDate;
      if (filterChild) params.child_id = filterChild;
      const [kids, logData] = await Promise.all([api.getChildrenFull(), api.getLogs(params)]);
      setChildren(kids);
      setLogs(logData);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [filterDate, filterChild]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.childId || !form.note.trim()) return;
    setSaving(true);
    try {
      await api.addLog({ childId: form.childId, type: form.type, note: form.note, date: form.date });
      setShowAdd(false);
      setForm({ childId: '', type: 'note', note: '', date: todayKey() });
      await load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this log entry?')) return;
    try { await api.deleteLog(id); await load(); }
    catch (e) { alert(e.message); }
  };

  // Group by date
  const grouped = logs.reduce((acc, l) => {
    if (!acc[l.date]) acc[l.date] = [];
    acc[l.date].push(l);
    return acc;
  }, {});
  const dates = Object.keys(grouped).sort().reverse();

  const getType = (id) => LOG_TYPES.find(t => t.id === id) || LOG_TYPES[0];

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading…</div>;

  return (
    <div>
      <SectionTitle action={
        <Btn onClick={() => { setForm({ childId: '', type: 'note', note: '', date: todayKey() }); setShowAdd(true); }} variant="success">
          + Add Entry
        </Btn>
      }>
        Daily Logs
      </SectionTitle>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select value={filterChild} onKeyDown={e=>e.stopPropagation()} onChange={e => setFilterChild(e.target.value)} style={{ flex: 1, minWidth: 180 }}>
          <option value="">All Children</option>
          {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={filterDate} onKeyDown={e=>e.stopPropagation()} onChange={e => setFilterDate(e.target.value)} style={{ flex: 1, minWidth: 160 }} />
        {(filterChild || filterDate) && (
          <Btn onClick={() => { setFilterChild(''); setFilterDate(''); }} variant="ghost" size="sm">Clear</Btn>
        )}
      </div>

      {dates.length === 0 && (
        <EmptyState icon="📝" message="No log entries yet. Add one to start tracking daily notes." />
      )}

      {dates.map(date => (
        <div key={date} style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 13, fontWeight: 800, color: 'var(--text3)', marginBottom: 12,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            {fmtDate(date)}
          </div>
          {grouped[date].map(l => {
            const child = children.find(c => c.id === l.child_id);
            const type  = getType(l.type);
            return (
              <div key={l.id} style={{
                display: 'flex', gap: 14, marginBottom: 12, background: '#fff',
                borderRadius: 14, padding: '16px 18px', border: '2px solid var(--border)',
                alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: type.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, flexShrink: 0,
                }}>
                  {type.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    {child && <Avatar child={child} size={24} />}
                    <span style={{ fontWeight: 800, fontSize: 15 }}>{l.name || '?'}</span>
                    <span style={{
                      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: type.color + '22', color: type.color,
                    }}>
                      {type.label}
                    </span>
                    {l.created_by && <span style={{ fontSize: 12, color: 'var(--text3)' }}>by {l.created_by}</span>}
                    <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>{fmt(l.created_at)}</span>
                  </div>
                  <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6 }}>{l.note}</p>
                </div>
                <button
                  onClick={() => del(l.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, padding: '2px 4px', flexShrink: 0 }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      ))}

      {showAdd && (
        <Modal title="Add Daily Log Entry" onClose={() => setShowAdd(false)} width={500}>
          <Field label="Child" required>
            <select value={form.childId} onKeyDown={e=>e.stopPropagation()} onChange={e => setForm(f => ({ ...f, childId: e.target.value }))}>
              <option value="">Select a child...</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Log Type">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LOG_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setForm(f => ({ ...f, type: t.id }))}
                  style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    fontFamily: 'Nunito', fontWeight: 700, fontSize: 13,
                    border: `2px solid ${form.type === t.id ? t.color : 'var(--border)'}`,
                    background: form.type === t.id ? t.color + '22' : 'transparent',
                    color: form.type === t.id ? t.color : 'var(--text2)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Date">
            <input type="date" value={form.date} onKeyDown={e=>e.stopPropagation()} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </Field>

          <Field label="Notes" required>
            <textarea
              value={form.note}
              onKeyDown={e=>e.stopPropagation()} onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="Describe what happened in detail..."
              style={{ minHeight: 100 }}
            />
          </Field>

          <div style={{ display: 'flex', gap: 12 }}>
            <Btn onClick={() => setShowAdd(false)} variant="ghost" full>Cancel</Btn>
            <Btn onClick={save} variant="success" full disabled={saving || !form.childId || !form.note.trim()}>
              {saving ? 'Saving…' : 'Save Entry'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
