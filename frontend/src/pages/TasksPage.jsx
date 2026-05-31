import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { tasksAPI, usersAPI, projectsAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import {
  STATUS_BADGE_CLASS, PRIORITY_BADGE_CLASS, STATUS_LABELS,
  STATUS_TRANSITIONS, canEditTask, extractError, formatDate, isOverdue, getInitials,
} from '../utils/helpers';

const STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function TaskModal({ task, users, projects, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'MEDIUM',
    assignee_id: task?.assignee_id || '',
    project_id: task?.project_id || '',
    due_date: task?.due_date ? task.due_date.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.assignee_id) delete payload.assignee_id;
      if (!payload.project_id) delete payload.project_id;
      if (!payload.due_date) delete payload.due_date;
      else payload.due_date = new Date(payload.due_date).toISOString();
      await onSave(payload);
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{task ? 'Edit Task' : 'New Task'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Priority</label>
                <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Due Date</label>
                <input className="input" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label className="input-label">Assignee</label>
                <select className="input" value={form.assignee_id} onChange={(e) => setForm({ ...form, assignee_id: e.target.value })}>
                  <option value="">Unassigned</option>
                  {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Project</label>
                <select className="input" value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">No Project</option>
                  {projects?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="spinner" style={{ width: 14, height: 14 }} />}
              {task ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusModal({ task, onClose, onUpdate }) {
  const allowed = STATUS_TRANSITIONS[task.status] || [];
  const [loading, setLoading] = useState(false);

  const handleChange = async (newStatus) => {
    setLoading(true);
    try {
      await onUpdate(newStatus);
      onClose();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    TODO: 'var(--text-muted)',
    IN_PROGRESS: 'var(--accent-blue)',
    IN_REVIEW: 'var(--accent-purple)',
    DONE: 'var(--accent-emerald)',
    BLOCKED: 'var(--accent-rose)',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '360px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Update Status</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
            Current: <span className={`badge ${STATUS_BADGE_CLASS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
          </p>
          {allowed.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No further transitions available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
              {allowed.map((s) => (
                <button key={s} className="btn btn-secondary" disabled={loading}
                  onClick={() => handleChange(s)}
                  style={{ justifyContent: 'flex-start', gap: '10px', borderColor: statusColors[s] + '40' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[s], flexShrink: 0 }} />
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ status: '', priority: '', assignee_id: '', page: 1 });
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [statusTask, setStatusTask] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksAPI.list({ ...filters, limit: 20 }).then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersAPI.list({ limit: 100 }).then((r) => r.data),
    enabled: user?.role !== 'MEMBER',
  });

  const { data: projectsData } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectsAPI.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: tasksAPI.create,
    onSuccess: () => { qc.invalidateQueries(['tasks']); toast.success('Task created'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => tasksAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['tasks']); toast.success('Task updated'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => tasksAPI.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['tasks']); toast.success('Status updated'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: tasksAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['tasks']); toast.success('Task deleted'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const tasks = data?.data || [];
  const pagination = data?.pagination;
  const users = usersData?.data || [];
  const projects = projectsData?.data || [];

  const canEdit = canEditTask(user?.role);

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Tasks</h1>
          {pagination && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{pagination.total} total tasks</p>}
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto', minWidth: '130px' }}
          value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', minWidth: '130px' }}
          value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}>
          <option value="">All Priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {user?.role !== 'MEMBER' && (
          <select className="input" style={{ width: 'auto', minWidth: '150px' }}
            value={filters.assignee_id} onChange={(e) => setFilters({ ...filters, assignee_id: e.target.value, page: 1 })}>
            <option value="">All Assignees</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
          </select>
        )}
        {(filters.status || filters.priority || filters.assignee_id) && (
          <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', assignee_id: '', page: 1 })}>
            Clear filters
          </button>
        )}
      </div>

      {/* Tasks table */}
      {isLoading ? (
        <div className="page-loading"><div className="spinner spinner-lg" /></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
          <span>No tasks found</span>
          {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create first task</button>}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Task', 'Status', 'Priority', 'Assignee', 'Project', 'Due Date', 'Actions'].map((h) => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, i) => {
                const overdue = isOverdue(task.due_date, task.status);
                const canChangeStatus = user?.role !== 'MEMBER' || task.assignee_id === user?.id;
                return (
                  <tr key={task.id} style={{ borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', maxWidth: '260px' }}>
                      <div style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      {task.description && <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{task.description}</div>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${STATUS_BADGE_CLASS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${PRIORITY_BADGE_CLASS[task.priority]}`}>{task.priority}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {task.assignee_name ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                            {getInitials(task.assignee_name)}
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{task.assignee_name}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {task.project_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: overdue ? 'var(--accent-rose)' : 'var(--text-secondary)', fontWeight: overdue ? 600 : 400 }}>
                      {overdue && '⚠ '}{formatDate(task.due_date)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {canChangeStatus && (
                          <button className="btn btn-ghost btn-sm btn-icon" title="Update status"
                            onClick={() => setStatusTask(task)}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                          </button>
                        )}
                        {canEdit && (
                          <>
                            <button className="btn btn-ghost btn-sm btn-icon" title="Edit"
                              onClick={() => setEditTask(task)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            {user?.role === 'ADMIN' && (
                              <button className="btn btn-ghost btn-sm btn-icon" title="Delete"
                                style={{ color: 'var(--accent-rose)' }}
                                onClick={() => { if (window.confirm('Delete this task?')) deleteMutation.mutate(task.id); }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
              <button className="btn btn-secondary btn-sm" disabled={filters.page === 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}>← Prev</button>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Page {filters.page} of {pagination.pages}</span>
              <button className="btn btn-secondary btn-sm" disabled={filters.page >= pagination.pages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <TaskModal users={users} projects={projects} onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutateAsync(data)} />
      )}
      {editTask && (
        <TaskModal task={editTask} users={users} projects={projects} onClose={() => setEditTask(null)}
          onSave={(data) => updateMutation.mutateAsync({ id: editTask.id, data })} />
      )}
      {statusTask && (
        <StatusModal task={statusTask} onClose={() => setStatusTask(null)}
          onUpdate={(status) => statusMutation.mutateAsync({ id: statusTask.id, status })} />
      )}
    </div>
  );
}
