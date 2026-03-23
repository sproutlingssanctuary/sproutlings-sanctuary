import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, Btn, Modal, Field, SectionTitle, EmptyState, Badge } from './UI';
import * as api from '../utils/api';

const COLORS = ['#FF6B6B', '#3A8C6E', '#9B8EC4', '#5BAD5B', '#FFB800', '#FF9500', '#00BCD4', '#E91E63', '#795548'];

const BLANK = {
  name: '', age: '', initials: '', color: '#3A8C6E',
  parents: '', emergency_contact: '', notes: '', pin: '', photo: '',
};

export default function ChildrenManager() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState(BLANK);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    try {
      const kids = await api.getChildrenFull();
      setChildren(kids);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setForm(BLANK); setEditId(null); setShowForm(true);
  };

  const openEdit = (child) => {
    setForm({
      name: child.name || '',
      age: child.age || '',
      initials: child.initials || '',
      color: child.color || '#3A8C6E',
      parents: child.parents || '',
      emergency_contact: child.emergency_contact || '',
      notes: child.notes || '',
      pin: child.pin || '',
      photo: child.photo || '',
    });
    setEditId(child.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age) || null,
        initials: form.initials || form.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
      };
      if (editId) {
        await api.updateChild(editId, payload);
      } else {
        await api.addChild(payload);
      }
      await load();
      setShowForm(false);
    } catch (e) {
      alert('Error saving: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const del = async (id, name) => {
    if (!window.confirm(`Remove ${name} from the system? This cannot be undone.`)) return;
    try {
      await api.deleteChild(id);
      await load();
    } catch (e) { alert(e.message); }
  };

  const F = ({ label, field, type = 'text', placeholder = '', required = false }) => (
    <Field label={label} required={required}>
      {type === 'textarea'
        ? <textarea value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} />
        : <input type={type} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} placeholder={placeholder} />
      }
    </Field>
  );

  const filtered = children.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading…</div>;

  return (
    <div>
      <SectionTitle
        action={<Btn onClick={openAdd} variant="primary">+ Add Child</Btn>}
      >
        Children ({children.length})
      </SectionTitle>

      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="🔍  Search children..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 340 }}
        />
      </div>

      {children.length === 0 && (
        <EmptyState icon="👶" message="No children enrolled yet. Add one to get started." />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {filtered.map(c => (
          <div key={c.id} style={{
            background: '#fff', borderRadius: 18, padding: 20,
            border: '2px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 14,
            transition: 'box-shadow 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar child={c} size={54} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 17 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)' }}>Age {c.age || '?'}</div>
                {c.pin && <Badge label="🔒 PIN set" color="#3A8C6E" />}
              </div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>👨‍👩‍👧 <strong>Parents:</strong> {c.parents || <em style={{ color: 'var(--text3)' }}>Not set</em>}</div>
              <div>🚨 <strong>Emergency:</strong> {c.emergency_contact || <em style={{ color: 'var(--text3)' }}>Not set</em>}</div>
            </div>
            {c.notes && (
              <div style={{
                background: '#FFF9E6', border: '1px solid #FFB80060', borderRadius: 10,
                padding: '8px 12px', fontSize: 13, color: '#CC8800', lineHeight: 1.5,
              }}>
                ⚠️ {c.notes}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <Btn onClick={() => openEdit(c)} variant="ghost" size="sm" style={{ flex: 1 }}>✏️ Edit</Btn>
              <Btn onClick={() => del(c.id, c.name)} variant="danger" size="sm" style={{ background: '#FFE8E8', color: '#FF6B6B', flex: 0 }}>✕</Btn>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal
          title={editId ? 'Edit Child Profile' : 'Add New Child'}
          onClose={() => setShowForm(false)}
          width={500}
        >
          <F label="Full Name" field="name" placeholder="e.g. Emma Johnson" required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Age">
              <input type="number" value={form.age} min="0" max="12"
                onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="e.g. 4" />
            </Field>
            <Field label="Initials (auto-generated)">
              <input value={form.initials} onChange={e => setForm(f => ({ ...f, initials: e.target.value.toUpperCase().slice(0,2) }))} placeholder="e.g. EJ" maxLength={2} />
            </Field>
          </div>

          <F label="Parent / Guardian Names" field="parents" placeholder="e.g. Sarah & Tom Johnson" />
          <F label="Emergency Contact" field="emergency_contact" placeholder="e.g. Sarah Johnson – 555-0101" />
          <F label="Medical Notes & Allergies" field="notes" type="textarea" placeholder="e.g. Severe peanut allergy – EpiPen in office drawer. Asthma inhaler in bag." />
          <F label="Check-In PIN (optional – leave blank for no PIN)" field="pin" type="password" placeholder="4–6 digit PIN" />

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Btn onClick={() => setShowForm(false)} variant="ghost" full>Cancel</Btn>
            <Btn onClick={save} variant="primary" full disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Child'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
