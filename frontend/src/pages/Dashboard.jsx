import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { tasksAPI, usersAPI } from '../services/api';
import useAuthStore from '../store/authStore';
import { formatRelative, STATUS_BADGE_CLASS, PRIORITY_BADGE_CLASS, STATUS_LABELS, isOverdue } from '../utils/helpers';

const StatCard = ({ label, value, icon, color, sub }) => (
  <div className="card" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10,
      background: `${color}20`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color,
    }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{label}</div>
      {sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  </div>
);

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', 'dashboard'],
    queryFn: () => tasksAPI.list({ limit: 100 }).then((r) => r.data),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users', 'dashboard'],
    queryFn: () => usersAPI.list({ limit: 100 }).then((r) => r.data),
    enabled: user?.role !== 'MEMBER',
  });

  const tasks = tasksData?.data || [];
  const users = usersData?.data || [];

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === 'TODO').length,
    inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    blocked: tasks.filter((t) => t.status === 'BLOCKED').length,
    high: tasks.filter((t) => t.priority === 'HIGH').length,
    overdue: tasks.filter((t) => isOverdue(t.due_date, t.status)).length,
  };

  const recentTasks = [...tasks].slice(0, 8);

  if (isLoading) return (
    <div className="page-loading">
      <div className="spinner spinner-lg" />
      <span>Loading dashboard...</span>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
          Welcome back, {user?.full_name}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <StatCard label="Total Tasks" value={stats.total} color="var(--accent-blue)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>} />
        <StatCard label="In Progress" value={stats.inProgress} color="var(--accent-cyan)"
          sub={`${stats.todo} to-do`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>} />
        <StatCard label="Completed" value={stats.done} color="var(--accent-emerald)"
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>} />
        <StatCard label="Overdue" value={stats.overdue} color="var(--accent-rose)"
          sub={`${stats.blocked} blocked`}
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>} />
      </div>

      {user?.role !== 'MEMBER' && users.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Team Members ({users.length})</h2>
          </div>
          <div className="grid-4">
            {users.slice(0, 4).map((u) => (
              <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px' }}>
                <div style={{
                  width: 34, height: 34, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px', fontWeight: 700, color: 'white', flexShrink: 0,
                }}>
                  {u.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</div>
                  <span className={`badge badge-${u.role.toLowerCase()}`} style={{ marginTop: '3px' }}>{u.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent tasks */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Recent Tasks</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks')}>View all</button>
        </div>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {recentTasks.length === 0 ? (
            <div className="empty-state">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              <span>No tasks yet</span>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Task', 'Status', 'Priority', 'Assignee', 'Updated'].map((h) => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentTasks.map((task, i) => (
                  <tr key={task.id}
                    onClick={() => navigate('/tasks')}
                    style={{ borderBottom: i < recentTasks.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', maxWidth: '280px' }}>
                      <div style={{ fontWeight: 500, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                      {isOverdue(task.due_date, task.status) && (
                        <span style={{ fontSize: '10px', color: 'var(--accent-rose)' }}>● Overdue</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${STATUS_BADGE_CLASS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span className={`badge ${PRIORITY_BADGE_CLASS[task.priority]}`}>{task.priority}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {task.assignee_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      {formatRelative(task.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
