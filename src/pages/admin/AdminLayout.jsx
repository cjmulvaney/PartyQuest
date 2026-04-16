import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useTheme } from '../../hooks/useTheme.jsx'
import { AdminToastProvider, useAdminToast } from '../../hooks/useAdminToast.jsx'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const NAV_ITEMS = [
  { to: '/admin', label: 'Missions', end: true },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/feedback', label: 'Feedback' },
  { to: '/admin/organizers', label: 'Organizers' },
  { to: '/admin/metrics', label: 'Metrics' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    if (!loading && !user) {
      signInWithGoogle()
    }
  }, [user, loading])

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="pq-spinner" />
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Loading...
        </p>
      </div>
    )
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div className="pq-spinner" />
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Signing in...
        </p>
      </div>
    )
  }

  // Check admin access
  if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: 'var(--color-bg)' }}
      >
        <div
          className="pq-card flex flex-col items-center gap-4 p-8"
          style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-danger-light)',
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-danger)' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-text)',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >
            Access Denied
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
            You don't have admin access. Please contact an administrator if you
            believe this is an error.
          </p>
          <div className="flex gap-3 pt-2">
            <button
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
              className="pq-btn pq-btn-ghost"
            >
              Sign out
            </button>
            <button onClick={() => navigate('/')} className="pq-btn pq-btn-primary">
              Go Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminToastProvider>
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      {/* Top nav bar */}
      <header
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div className="mx-auto flex items-center justify-between px-4 py-3" style={{ maxWidth: '1120px' }}>
          {/* Left: logo + nav */}
          <div className="flex items-center gap-6">
            <h1
              className="cursor-pointer"
              onClick={() => navigate('/admin')}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-primary)',
                margin: 0,
              }}
            >
              PQ Admin
            </h1>

            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="px-3 py-1.5"
                  style={({ isActive }) => ({
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    borderRadius: 'var(--radius-md)',
                    transition: 'var(--transition-fast)',
                    textDecoration: 'none',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? 'var(--color-primary-light)' : 'transparent',
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: theme toggle + sign out */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="theme-toggle"
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
              className="pq-btn pq-btn-ghost"
              style={{ fontSize: '0.875rem' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto px-4 py-6" style={{ maxWidth: '1120px' }}>
        <Outlet />
      </main>
    </div>
    </AdminToastProvider>
  )
}
