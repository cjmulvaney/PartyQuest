import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

const NAV_ITEMS = [
  { to: '/admin', label: 'Missions', end: true },
  { to: '/admin/events', label: 'Events' },
  { to: '/admin/feedback', label: 'Feedback' },
  { to: '/admin/organizers', label: 'Organizers' },
]

export default function AdminLayout() {
  const navigate = useNavigate()
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      signInWithGoogle()
    }
  }, [user, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <p className="text-stone-500">Loading...</p>
      </div>
    )
  }

  if (!user) return null

  // Check admin access
  if (ADMIN_EMAIL && user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-800">Access Denied</h1>
          <p className="text-stone-500">You don't have admin access.</p>
          <button
            onClick={() => navigate('/')}
            className="text-emerald-700 font-medium hover:underline"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Top bar */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1
              className="text-lg font-bold text-emerald-700 cursor-pointer"
              onClick={() => navigate('/admin')}
            >
              PQ Admin
            </h1>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <button
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
            className="text-stone-400 text-sm hover:text-stone-600"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Page content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </div>
    </div>
  )
}
