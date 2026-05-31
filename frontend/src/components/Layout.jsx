import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { useWebSocket } from '../hooks/useWebSocket';
import { getInitials, ROLE_BADGE_CLASS } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { isConnected, notifications, unreadCount, markAllRead, clearNotifications } = useWebSocket();
  const [showNotif, setShowNotif] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    )},
    { to: '/tasks', label: 'Tasks', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    )},
    { to: '/projects', label: 'Projects', icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
      </svg>
    )},
    ...(user?.role === 'ADMIN' || user?.role === 'MANAGER' ? [
      { to: '/users', label: 'Team', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
        </svg>
      )},
    ] : []),
    ...(user?.role === 'ADMIN' || user?.role === 'MANAGER' ? [
      { to: '/analytics', label: 'Analytics', icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
        </svg>
      )},
    ] : []),
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '220px' : '60px',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.2s ease',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--accent-blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
          </div>
          {sidebarOpen && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', letterSpacing: '-0.3px' }}>TaskTracker</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{user?.org_name}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '9px 10px', borderRadius: 'var(--radius-sm)',
                textDecoration: 'none', fontSize: '13px', fontWeight: 500,
                color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
                background: isActive ? 'var(--accent-blue-glow)' : 'transparent',
                transition: 'all 0.1s ease',
                whiteSpace: 'nowrap', overflow: 'hidden',
              })}
              onMouseEnter={(e) => { if (!e.currentTarget.classList.contains('active')) e.currentTarget.style.background = 'var(--bg-card)'; }}
              onMouseLeave={(e) => { if (!e.currentTarget.style.background.includes('glow')) e.currentTarget.style.background = 'transparent'; }}>
              <span style={{ flexShrink: 0 }}>{item.icon}</span>
              {sidebarOpen && item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar toggle */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: sidebarOpen ? 'flex-start' : 'center', padding: '8px 10px' }}
            onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {sidebarOpen
                ? <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
                : <path d="M13 5l7 7-7 7M5 5l7 7-7 7"/>}
            </svg>
            {sidebarOpen && <span style={{ fontSize: '12px' }}>Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{
          height: '56px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', flexShrink: 0,
        }}>
          <div></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* WS status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginRight: '4px' }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: isConnected ? 'var(--accent-emerald)' : 'var(--text-muted)',
              }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{isConnected ? 'Live' : 'Offline'}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowNotif(!showNotif); if (!showNotif) markAllRead(); }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>

              {showNotif && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  width: '320px', background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)', borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-card)', zIndex: 50,
                  maxHeight: '400px', overflow: 'auto',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>Notifications</span>
                    {notifications.length > 0 && (
                      <button className="btn btn-ghost" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={clearNotifications}>Clear all</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>No notifications</div>
                  ) : notifications.map((n) => (
                    <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: n.read ? 'transparent' : 'var(--accent-blue-glow)' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '2px' }}>Task status changed</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>"{n.taskTitle}" → {n.newStatus}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>by {n.changedBy}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button className="btn btn-ghost" style={{ gap: '8px', padding: '6px 10px' }}
                onClick={() => setShowUserMenu(!showUserMenu)}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: 'white', flexShrink: 0,
                }}>
                  {getInitials(user?.full_name)}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{user?.full_name}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{user?.role}</div>
                </div>
              </button>

              {showUserMenu && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  width: '180px', background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)', borderRadius: 'var(--radius)',
                  boxShadow: 'var(--shadow-card)', zIndex: 50,
                }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{user?.email}</div>
                    <span className={`badge ${ROLE_BADGE_CLASS[user?.role]}`} style={{ marginTop: '6px' }}>{user?.role}</span>
                  </div>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '10px 14px', borderRadius: 0, color: 'var(--accent-rose)', gap: '8px' }}
                    onClick={handleLogout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg-primary)' }}>
          <Outlet />
        </main>
      </div>

      {/* Close dropdowns on outside click */}
      {(showNotif || showUserMenu) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40 }}
          onClick={() => { setShowNotif(false); setShowUserMenu(false); }} />
      )}
    </div>
  );
}
