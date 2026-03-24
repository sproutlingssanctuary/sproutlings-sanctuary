import React, { useState, useEffect, useCallback } from 'react';
import { Btn, Modal, Field, SectionTitle, EmptyState } from './UI';
import * as api from '../utils/api';

export default function StaffManager({ currentUser }) {
  const [staff, setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ username: '', password: '', role: 'staff' });
  const [saving, setSaving]   = useState(false);
  const [changePw, setChangePw] = useState(null);
  const [newPw, setNewPw]       = useState('');
  const [pwError, setPwError]   = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api.getStaff();
      setStaff(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.username || !form.password) return;
    setSaving(true);
    try {
      await api.addStaff(form);
      setShowAdd(false);
      setForm({ username: '', password: '', role: 'staff' });
      await load();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (!newPw || newPw.length < 4) { setPwError('Must be at least 4 characters'); return; }
    setPwSaving(true); setPwError('');
    try {
      const token = localStorage.getItem('daycare_token');
      const res = await fetch('/api/staff/' + changePw.id + '/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ newPassword: newPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChangePw(null); setNewPw('');
      alert('Password changed successfully!');
    } catch(e) { setPwError(e.message); }
    finally { setPwSaving(false); }
  };

  const del = async (id, username) => {
    if (id === currentUser?.id) return alert("You can't delete your own account.");
    if (!window.confirm(`Remove staff member "${username}"?`)) return;
    try { await api.deleteStaff(id); await load(); }
    catch (e) { alert(e.message); }
  };

  const roleBadge = (role) => (
    <span style={{
      display: 'inline-block', padding: '2px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: role === 'admin' ? '#E8A94A22' : '#3A8C6E22',
      color: role === 'admin' ? '#CC8800' : '#3A8C6E',
    }}>
      {role === 'admin' ? '⭐ Admin' : '👤 Staff'}
    </span>
  );

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Loading…</div>;

  return (
    <div>
      <SectionTitle action={
        <Btn onClick={() => { setForm({ username: '', password: '', role: 'staff' }); setShowAdd(true); }} variant="primary">
          + Add Staff
        </Btn>
      }>
        Staff Accounts ({staff.length})
      </SectionTitle>

      <div style={{
        background: '#FFF9E6', border: '2px solid #E8A94A50', borderRadius: 14,
        padding: '12px 18px', marginBottom: 24, fontSize: 14, color: '#CC8800', lineHeight: 1.6,
      }}>
        ⭐ <strong>Admin</strong> accounts can add/remove children, manage staff, and access all reports.
        {' '}<strong>Staff</strong> accounts can view attendance, add daily logs, and check children in/out.
      </div>

      {staff.length === 0 && <EmptyState icon="👤" message="No staff accounts found." />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {staff.map(s => (
          <div key={s.id} style={{
            background: '#fff', borderRadius: 14, padding: '16px 20px',
            border: '2px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: s.role === 'admin' ? '#E8A94A22' : '#3A8C6E22',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>
              {s.role === 'admin' ? '⭐' : '👤'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {s.username}
                {s.id === currentUser?.id && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}>(you)</span>
                )}
              </div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                {roleBadge(s.role)}
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                  Added: {new Date(s.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <Btn onClick={()=>{setChangePw(s);setNewPw('');setPwError('');}} variant="ghost" size="sm">
                🔑 Change Password
              </Btn>
              {s.id !== currentUser?.id && (
                <Btn onClick={()=>del(s.id,s.username)} variant="ghost" size="sm" style={{color:'#E8734A',borderColor:'#E8734A30'}}>
                  Remove
                </Btn>
              )}
            </div>
          </div>
        ))}
      </div>

      {changePw && (
        <Modal title={'Change Password – ' + changePw.username} onClose={()=>setChangePw(null)} width={400}>
          {pwError && (
            <div style={{background:'#FFE8E8',color:'#E8734A',borderRadius:10,padding:'10px 16px',marginBottom:14,fontSize:14,fontWeight:700}}>
              {pwError}
            </div>
          )}
          <Field label="New Password" required>
            <input
              type="password"
              value={newPw}
              onKeyDown={e=>e.stopPropagation()}
              onChange={e=>setNewPw(e.target.value)}
              placeholder="Min 4 characters"
              autoComplete="new-password"
            />
          </Field>
          <div style={{display:'flex',gap:12,marginTop:8}}>
            <Btn onClick={()=>setChangePw(null)} variant="ghost" full>Cancel</Btn>
            <Btn onClick={savePassword} variant="primary" full disabled={pwSaving||!newPw}>
              {pwSaving?'Saving...':'Change Password'}
            </Btn>
          </div>
        </Modal>
      )}

      {showAdd && (
        <Modal title="Add Staff Account" onClose={() => setShowAdd(false)} width={420}>
          <Field label="Username" required>
            <input
              value={form.username}
              onKeyDown={e=>e.stopPropagation()} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g,'') }))}
              placeholder="e.g. sarah_smith"
              autoComplete="off"
            />
          </Field>
          <Field label="Password" required>
            <input
              type="password"
              value={form.password}
              onKeyDown={e=>e.stopPropagation()} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Role">
            <select value={form.role} onKeyDown={e=>e.stopPropagation()} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="staff">Staff – Limited access</option>
              <option value="admin">Admin – Full access</option>
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 12 }}>
            <Btn onClick={() => setShowAdd(false)} variant="ghost" full>Cancel</Btn>
            <Btn onClick={save} variant="primary" full disabled={saving || !form.username || !form.password}>
              {saving ? 'Creating…' : 'Create Account'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
