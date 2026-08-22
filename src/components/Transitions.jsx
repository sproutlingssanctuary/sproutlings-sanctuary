import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Btn, SectionTitle, EmptyState, Modal, Field } from './UI';
import * as api from '../utils/api';

function calcAgeYears(dob) {
  if (!dob) return null;
  const b = new Date(dob), n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--;
  return y;
}

function kindergartenStart(dob) {
  if (!dob) return null;
  const b = new Date(dob);
  const yearTurns5 = b.getFullYear() + 5;
  return `September ${yearTurns5}`;
}

function monthsUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  const now = new Date();
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return months;
}

export default function Transitions() {
  const [children, setChildren] = useState([]);
  const [transitions, setTransitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ childId: '', expected_exit_date: '', status: 'active', notes: '' });

  const load = useCallback(async () => {
    try {
      const [kids, trans] = await Promise.all([api.getChildrenFull(), api.getTransitions()]);
      setChildren(kids);
      setTransitions(trans);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setForm({ childId: '', expected_exit_date: '', status: 'active', notes: '' }); setEditId(null); setShowForm(true); };
  const openEdit = (t) => { setForm({ childId: t.child_id, expected_exit_date: t.expected_exit_date ? t.expected_exit_date.slice(0,10) : '', status: t.status || 'active', notes: t.notes || '' }); setEditId(t.id); setShowForm(true); };

  const save = async () => {
    try {
      const payload = { childId: Number(form.childId), expected_exit_date: form.expected_exit_date, status: form.status, notes: form.notes };
      if (editId) await api.updateTransition(editId, payload);
      else await api.addTransition(payload);
      await load(); setShowForm(false);
    } catch (e) { alert('Error: ' + e.message); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this transition record?')) return;
    try { await api.deleteTransition(id); await load(); } catch (e) { alert(e.message); }
  };

  // Auto-calculate expected exit from DOB if not manually set
  const enriched = children.map(c => {
    const manual = transitions.find(t => t.child_id === c.id);
    const autoExit = kindergartenStart(c.dob);
    const exitDate = manual?.expected_exit_date || autoExit;
    const mos = monthsUntil(exitDate);
    let status = manual?.status || 'active';
    if (!manual && mos !== null) {
      if (mos < 0) status = 'graduated';
      else if (mos <= 6) status = 'graduating-soon';
      else status = 'active';
    }
    return { ...c, exitDate, monthsUntil: mos, status, manualId: manual?.id };
  });

  const graduatingThisYear = enriched.filter(c => c.monthsUntil !== null && c.monthsUntil >= 0 && c.monthsUntil <= 12).length;
  const total = children.length;

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading…</div>;

  return (
    <div>
      <SectionTitle action={<Btn onClick={openAdd} variant="primary">+ Add Transition</Btn>}>
        Transitions & Graduation
      </SectionTitle>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="glass" style={{ borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#E8734A' }}>{graduatingThisYear}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700 }}>Graduating within 12 months</div>
        </div>
        <div className="glass" style={{ borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#5BAD5B' }}>{total - graduatingThisYear}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700 }}>Active / Long-term</div>
        </div>
        <div className="glass" style={{ borderRadius: 16, padding: 20, textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#3A8C6E' }}>{total}</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 700 }}>Total Enrolled</div>
        </div>
      </div>

      {enriched.length === 0 && <EmptyState icon="🎓" message="No children enrolled yet." />}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {enriched.map(c => {
          const statusColors = {
            active: '#5BAD5B',
            'graduating-soon': '#FFB800',
            graduated: '#8A9AB0',
            deferred: '#9B8EC4',
          };
          const statusLabels = {
            active: 'Active',
            'graduating-soon': 'Graduating Soon',
            graduated: 'Graduated',
            deferred: 'Deferred',
          };
          const color = statusColors[c.status] || '#3A8C6E';
          return (
            <div key={c.id} className="hover-lift" style={{
              background: 'var(--card)', borderRadius: 18, padding: 20,
              border: `2px solid ${color}25`, boxShadow: 'var(--shadow)',
              display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar child={c} size={48} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 900, fontSize: 17 }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>Age {calcAgeYears(c.dob) || c.age}</div>
                </div>
                <div style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 900,
                  background: `${color}18`, color: color,
                }}>
                  {statusLabels[c.status] || c.status}
                </div>
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text2)' }}>
                <div>🎓 <strong>Expected Exit:</strong> {c.exitDate || 'Not set'}</div>
                {c.monthsUntil !== null && c.monthsUntil >= 0 && (
                  <div>⏳ <strong>Leaves in:</strong> {c.monthsUntil} months</div>
                )}
                {c.monthsUntil !== null && c.monthsUntil < 0 && (
                  <div>✅ <strong>Graduated</strong></div>
                )}
                {c.notes && <div style={{ marginTop: 6, color: '#CC8800', fontSize: 13 }}>📝 {c.notes}</div>}
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <Btn onClick={() => openEdit({ id: c.manualId, child_id: c.id, expected_exit_date: c.manualId ? c.exitDate : '', status: c.status, notes: c.notes || '' })} variant="ghost" size="sm" full>
                  {c.manualId ? '✏️ Edit' : '➕ Set Exit Date'}
                </Btn>
                {c.manualId && (
                  <Btn onClick={() => del(c.manualId)} variant="danger" size="sm" style={{ flex: 0, background: '#FFE8E8', color: '#FF6B6B' }}>✕</Btn>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <Modal title={editId ? 'Edit Transition' : 'Add Transition Plan'} onClose={() => setShowForm(false)} width={420}>
          <Field label="Child" required>
            <select value={form.childId} onChange={e => setForm(f => ({ ...f, childId: e.target.value }))}>
              <option value="">Select child</option>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Expected Exit Date (optional - auto-calculated from DOB)">
            <input type="date" value={form.expected_exit_date} onChange={e => setForm(f => ({ ...f, expected_exit_date: e.target.value }))} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="active">Active</option>
              <option value="graduating-soon">Graduating Soon</option>
              <option value="graduated">Graduated</option>
              <option value="deferred">Deferred</option>
            </select>
          </Field>
          <Field label="Notes">
            <textarea placeholder="e.g. Moving to Little Sprouts Elementary" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </Field>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Btn onClick={() => setShowForm(false)} variant="ghost" full>Cancel</Btn>
            <Btn onClick={save} variant="primary" full>{editId ? 'Save' : 'Add'}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
