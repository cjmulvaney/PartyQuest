import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAdminToast } from '../../hooks/useAdminToast.jsx'
import { getAvatarColor, getInitials } from '../../lib/avatar.js'

export default function UsersPage() {
  const { toast } = useAdminToast()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data, error } = await supabase.rpc('rpc_get_organizer_users')
    if (error) {
      toast.error(`Failed to load users: ${error.message}`)
      setLoading(false)
      return
    }
    setUsers(data || [])
    setLoading(false)
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'full_name' || key === 'email' ? 'asc' : 'desc')
    }
  }

  const displayed = useMemo(() => {
    let result = users
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          (u.full_name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      )
    }
    result = [...result].sort((a, b) => {
      let aVal = a[sortKey] ?? ''
      let bVal = b[sortKey] ?? ''
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [users, search, sortKey, sortDir])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="pq-spinner" />
      </div>
    )
  }

  const SortHeader = ({ label, field }) => (
    <th
      className="pb-3 pt-1 text-left font-semibold text-xs uppercase tracking-wider px-4"
      style={{
        color: sortKey === field ? 'var(--color-primary)' : 'var(--color-text-muted)',
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={() => handleSort(field)}
    >
      {label}
      {sortKey === field && (
        <span style={{ marginLeft: '0.25rem' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>
      )}
    </th>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
        >
          Organizer Sign-Ins
        </h2>
        <span
          className="text-sm font-medium px-3 py-1"
          style={{
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          {displayed.length} user{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="pq-input"
          style={{ width: '280px' }}
        />
      </div>

      {displayed.length === 0 ? (
        <div className="pq-card text-center py-12">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {users.length === 0 ? 'No users yet.' : 'No users match your search.'}
          </p>
        </div>
      ) : (
        <div className="pq-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <th
                    className="pb-3 pt-1 text-left font-semibold text-xs uppercase tracking-wider px-4"
                    style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', width: '40px' }}
                  />
                  <SortHeader label="Name" field="full_name" />
                  <SortHeader label="Email" field="email" />
                  <SortHeader label="Signed Up" field="created_at" />
                  <SortHeader label="Last Sign In" field="last_sign_in_at" />
                </tr>
              </thead>
              <tbody>
                {displayed.map((user) => {
                  const displayName = user.full_name || user.email || 'Unknown'
                  const initials = getInitials(displayName)
                  const avatarColor = getAvatarColor(displayName)

                  return (
                    <tr
                      key={user.id}
                      style={{ borderBottom: '1px solid var(--color-border-light)' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <td className="py-3 px-4">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={displayName}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-full)',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: avatarColor,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#fff',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: 'var(--color-text)' }}>
                        {user.full_name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                      <td className="py-3 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                        {user.email}
                      </td>
                      <td className="py-3 px-4" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4" style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        {user.last_sign_in_at
                          ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
