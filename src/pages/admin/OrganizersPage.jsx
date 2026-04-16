import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAdminToast } from '../../hooks/useAdminToast.jsx'

export default function OrganizersPage() {
  const { toast } = useAdminToast()
  const [organizers, setOrganizers] = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedOrg, setExpandedOrg] = useState(null)
  const [sortKey, setSortKey] = useState('eventCount')
  const [sortDir, setSortDir] = useState('desc')

  useEffect(() => {
    loadOrganizers()
  }, [])

  async function loadOrganizers() {
    // Get all events grouped by organizer
    const { data: events, error } = await supabase
      .from('events')
      .select('organizer_id, id, name, status, start_time, event_code, organizer_email')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(`Failed to load organizers: ${error.message}`)
      setLoading(false)
      return
    }

    if (!events || events.length === 0) {
      setOrganizers([])
      setAllEvents([])
      setLoading(false)
      return
    }

    setAllEvents(events)

    // Group by organizer_id
    const byOrganizer = {}
    events.forEach((e) => {
      if (!e.organizer_id) return
      if (!byOrganizer[e.organizer_id]) {
        byOrganizer[e.organizer_id] = { id: e.organizer_id, eventCount: 0, activeCount: 0 }
      }
      byOrganizer[e.organizer_id].eventCount++
      if (e.status === 'active') byOrganizer[e.organizer_id].activeCount++
    })

    // Get organizer emails from events table
    const emailMap = {}
    events.forEach((e) => {
      if (e.organizer_email) emailMap[e.organizer_id] = e.organizer_email
    })

    const list = Object.values(byOrganizer).map((org) => ({
      ...org,
      email: emailMap[org.id] || org.id.substring(0, 8) + '...',
    }))

    setOrganizers(list)
    setLoading(false)
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'email' ? 'asc' : 'desc')
    }
  }

  const displayed = useMemo(() => {
    let result = organizers
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((o) => o.email.toLowerCase().includes(q))
    }
    result.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [organizers, search, sortKey, sortDir])

  // Events for expanded organizer
  const expandedEvents = useMemo(() => {
    if (!expandedOrg) return []
    return allEvents.filter((e) => e.organizer_id === expandedOrg)
  }, [expandedOrg, allEvents])

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
        <span style={{ marginLeft: '0.25rem' }}>{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  )

  const statusBadge = (status) => {
    const map = {
      active: 'pq-badge pq-badge-success',
      upcoming: 'pq-badge pq-badge-warning',
      ended: 'pq-badge pq-badge-muted',
    }
    return map[status] || map.ended
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
        >
          Organizer Accounts
        </h2>
        <span
          className="text-sm font-medium px-3 py-1"
          style={{
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          {displayed.length} organizer{displayed.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizers..."
          className="pq-input"
          style={{ width: '250px' }}
        />
      </div>

      {displayed.length === 0 ? (
        <div className="pq-card text-center py-12">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {organizers.length === 0 ? 'No organizers yet.' : 'No organizers match your search.'}
          </p>
        </div>
      ) : (
        <div className="pq-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                  <SortHeader label="Email / ID" field="email" />
                  <SortHeader label="Total Events" field="eventCount" />
                  <SortHeader label="Active Events" field="activeCount" />
                  <th className="pb-3 pt-1 text-left font-semibold text-xs uppercase tracking-wider px-4" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((org) => (
                  <>
                    <tr
                      key={org.id}
                      style={{
                        borderBottom: expandedOrg === org.id ? 'none' : '1px solid var(--color-border-light)',
                        transition: 'var(--transition-fast)',
                        backgroundColor: expandedOrg === org.id ? 'var(--color-surface-hover)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (expandedOrg !== org.id) e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
                      }}
                      onMouseLeave={(e) => {
                        if (expandedOrg !== org.id) e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <td className="py-3.5 px-4 font-medium" style={{ color: 'var(--color-text)' }}>
                        {org.email}
                      </td>
                      <td className="py-3.5 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                        <span
                          className="inline-flex items-center justify-center w-7 h-7 text-xs font-semibold"
                          style={{
                            backgroundColor: 'var(--color-primary-subtle)',
                            color: 'var(--color-primary)',
                            borderRadius: 'var(--radius-full)',
                          }}
                        >
                          {org.eventCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                        {org.activeCount > 0 ? (
                          <span className="pq-badge pq-badge-success">{org.activeCount} active</span>
                        ) : (
                          <span className="pq-badge pq-badge-muted">none</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                          className="pq-btn pq-btn-ghost"
                          style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}
                        >
                          {expandedOrg === org.id ? 'Hide Events' : 'View Events'}
                        </button>
                      </td>
                    </tr>
                    {/* Expanded row: show events */}
                    {expandedOrg === org.id && (
                      <tr key={`${org.id}-detail`}>
                        <td
                          colSpan={4}
                          style={{
                            padding: '0 1rem 1rem 2.5rem',
                            borderBottom: '1px solid var(--color-border-light)',
                            backgroundColor: 'var(--color-surface-hover)',
                          }}
                        >
                          <div className="space-y-2">
                            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                              Events by {org.email}:
                            </p>
                            {expandedEvents.map((ev) => (
                              <div
                                key={ev.id}
                                className="flex items-center gap-3 py-1.5"
                                style={{ borderBottom: '1px solid var(--color-border-light)' }}
                              >
                                <span className="text-sm font-medium" style={{ color: 'var(--color-text)', minWidth: '150px' }}>
                                  {ev.name}
                                </span>
                                <span className={`capitalize ${statusBadge(ev.status)}`}>{ev.status}</span>
                                <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                                  {ev.event_code}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                  {ev.start_time
                                    ? new Date(ev.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    : ''}
                                </span>
                              </div>
                            ))}
                            {expandedEvents.length === 0 && (
                              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No events found.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
