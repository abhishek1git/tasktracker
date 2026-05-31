import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { projectsAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { canManageProjects, extractError, formatDate } from '../utils/helpers';

function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({ name: project?.name || '', description: project?.description || '' });
  const [loading, setLoading] = useState(false);

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
          <span className="modal-title">{project ? 'Edit Project' : 'New Project'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="input-group">
              <label className="input-label">Project Name *</label>
              <input className="input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Description</label>
              <textarea className="input" rows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading && <span className="spinner" style={{ width: 14, height: 14 }} />}
              {project ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const PROJECT_COLORS = [
  'var(--accent-blue)', 'var(--accent-purple)', 'var(--accent-emerald)',
  'var(--accent-amber)', 'var(--accent-cyan)', 'var(--accent-rose)',
];

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.list().then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: projectsAPI.create,
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project created'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => projectsAPI.update(id, data),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project updated'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: projectsAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project deleted'); },
    onError: (err) => toast.error(extractError(err)),
  });

  const projects = data?.data || [];
  const canManage = canManageProjects(user?.role);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Projects</h1>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{projects.length} projects</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Project
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="page-loading"><div className="spinner spinner-lg" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state card">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>
          <span>No projects yet</span>
          {canManage && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>Create first project</button>}
        </div>
      ) : (
        <div className="grid-3">
          {projects.map((p, idx) => {
            const color = PROJECT_COLORS[idx % PROJECT_COLORS.length];
            return (
              <div key={p.id} className="card" style={{ borderTop: `3px solid ${color}`, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                    </svg>
                  </div>
                  {canManage && (
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditProject(p)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      {user?.role === 'ADMIN' && (
                        <button className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--accent-rose)' }}
                          onClick={() => { if (window.confirm('Delete project?')) deleteMutation.mutate(p.id); }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{p.name}</h3>
                  {p.description && (
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {p.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                      <path d="M9 11l3 3L22 4"/>
                    </svg>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.task_count} tasks</span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Created {formatDate(p.created_at)}</span>
                </div>

                {p.creator_name && (
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    by {p.creator_name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <ProjectModal onClose={() => setShowCreate(false)}
          onSave={(data) => createMutation.mutateAsync(data)} />
      )}
      {editProject && (
        <ProjectModal project={editProject} onClose={() => setEditProject(null)}
          onSave={(data) => updateMutation.mutateAsync({ id: editProject.id, data })} />
      )}
    </div>
  );
}
