import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { usersAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { ROLE_BADGE_CLASS, extractError, formatDate, getInitials } from '../utils/helpers';

const ROLES = ['ADMIN', 'MANAGER', 'MEMBER'];

function EditUserModal({ user: targetUser, onClose, onSave }) {
  const [form, setForm] = useState({ full_name: targetUser.full_name, role: targetUser.role, is_active: targetUser.is_active });
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit User</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input className="input" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            {currentUser?.role === 'ADMIN' && (
              <>
                <div className="input-group">
                  <label className="input-label">Role</label>
                  <select className="input" value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    {ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }} />
                    <span style={{ fontSize: '13px' }}>Account active</span>
                  </label>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="spinner" style={{ width: 14, height: 14 }} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const [editUser, setEditUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => usersAPI.list({ role: roleFilter || undefined, limit: 100 }).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => usersAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User updated'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: usersAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User removed'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const users = data?.data || [];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Team Members</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{users.length} members in your organization</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select className="input" style={{ width: 'auto' }} value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Org ID card */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Organization ID (share to invite members)</span>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            {currentUser?.organization_id}
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}
          onClick={() => { navigator.clipboard.writeText(currentUser?.organization_id); toast.success('Copied!'); }}>
          Copy
        </button>
      </div>

      {isLoading ? (
        <div className="page-loading"><div className="spinner spinner-lg" /></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Member', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: '50%',
                        background: u.is_active
                          ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))'
                          : 'var(--bg-card-hover)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>
                        {getInitials(u.full_name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {u.full_name}
                          {u.id === currentUser?.id && (
                            <span style={{ fontSize: '10px', color: 'var(--accent-blue)', background: 'var(--accent-blue-glow)', padding: '1px 5px', borderRadius: '4px' }}>you</span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className={`badge badge-${u.role.toLowerCase()}`}>{u.role}</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '12px', color: u.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)',
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: u.is_active ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {formatDate(u.created_at)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Edit"
                        onClick={() => setEditUser(u)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {currentUser?.role === 'ADMIN' && u.id !== currentUser?.id && (
                        <button className="btn btn-ghost btn-sm btn-icon" title="Remove"
                          style={{ color: 'var(--accent-rose)' }}
                          onClick={() => { if (window.confirm(`Remove ${u.full_name}?`)) deleteMutation.mutate(u.id); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)}
          onSave={(data) => updateMutation.mutateAsync({ id: editUser.id, data })} />
      )}
    </div>
  );
}
