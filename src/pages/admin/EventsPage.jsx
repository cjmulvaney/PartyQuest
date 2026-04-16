import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase.js'
import { useAdminToast } from '../../hooks/useAdminToast.jsx'

export default function EventsPage() {
  const { toast } = useAdminToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    // Single query: get all events with participant counts via a joined subquery approach
    const { data, error } = await supabase
      .from('events')
      .select('id, name, event_type, status, start_time, end_time, event_code, created_at, organizer_id, organizer_email')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(`Failed to load events: ${error.message}`)
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setEvents([])
      setLoading(false)
      return
    }

    // Batch: get all participants for all events in one query
    const eventIds = data.map((e) => e.id)

    const [{ data: allParticipants }, { data: allPM }] = await Promise.all([
      supabase
        .from('participants')
        .select('id, event_id')
        .in('event_id', eventIds),
      supabase
        .from('participant_missions')
        .select('participant_id, completed')
        .in(
          'participant_id',
          // We need participant IDs — but we can get them from participants query above
          // Instead, do a join approach: get all participant_missions for these events
          [] // placeholder, will use a different approach
        ),
    ])

    // Build participant ID list and re-query participant_missions
    const participantIds = (allParticipants || []).map((p) => p.id)

    let allMissions = []
    if (participantIds.length > 0) {
      // Batch in chunks of 500 to avoid query limits
      for (let i = 0; i < participantIds.length; i += 500) {
        const chunk = participantIds.slice(i, i + 500)
        const { data: pmData } = await supabase
          .from('participant_missions')
          .select('participant_id, completed')
          .in('participant_id', chunk)
        if (pmData) allMissions.push(...pmData)
      }
    }

    // Build lookup maps
    const participantsByEvent = {}
    ;(allParticipants || []).forEach((p) => {
      if (!participantsByEvent[p.event_id]) participantsByEvent[p.event_id] = []
      participantsByEvent[p.event_id].push(p.id)
    })

    const participantToEvent = {}
    ;(allParticipants || []).forEach((p) => {
      participantToEvent[p.id] = p.event_id
    })

    // Group missions by event
    const missionsByEvent = {}
    allMissions.forEach((pm) => {
      const eventId = participantToEvent[pm.participant_id]
      if (!eventId) return
      if (!missionsByEvent[eventId]) missionsByEvent[eventId] = { total: 0, completed: 0 }
      missionsByEvent[eventId].total++
      if (pm.completed) missionsByEvent[eventId].completed++
    })

    const enriched = data.map((event) => {
      const stats = missionsByEvent[event.id] || { total: 0, completed: 0 }
      const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0
      return {
        ...event,
        participantCount: (participantsByEvent[event.id] || []).length,
        totalMissions: stats.total,
        completedMissions: stats.completed,
        completionRate,
      }
    })

    setEvents(enriched)
    setLoading(false)
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  // Unique event types for filter
  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.event_type).filter(Boolean))
    return [...types].sort()
  }, [events])

  // Filter + sort
  const displayed = useMemo(() => {
    let result = events.filter((e) => {
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (typeFilter !== 'all' && e.event_type !== typeFilter) return false
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.event_code?.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

    result.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]

      if (sortKey === 'name') {
        aVal = (aVal || '').toLowerCase()
        bVal = (bVal || '').toLowerCase()
      } else if (typeof aVal === 'string') {
        aVal = aVal || ''
        bVal = bVal || ''
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [events, statusFilter, typeFilter, search, sortKey, sortDir])

  function exportCsv() {
    const rows = [['Name', 'Type', 'Code', 'Status', 'Participants', 'Completed', 'Total', 'Rate', 'Start Date']]
    displayed.forEach((e) => {
      rows.push([
        `"${(e.name || '').replace(/"/g, '""')}"`,
        e.event_type || '',
        e.event_code || '',
        e.status,
        e.participantCount,
        e.completedMissions,
        e.totalMissions,
        `${e.completionRate}%`,
        e.start_time ? new Date(e.start_time).toLocaleDateString() : '',
      ])
    })
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `party-quest-events-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${displayed.length} events`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="pq-spinner" />
      </div>
    )
  }

  const statusBadgeClass = (status) => {
    const map = {
      active: 'pq-badge pq-badge-success',
      upcoming: 'pq-badge pq-badge-warning',
      ended: 'pq-badge pq-badge-muted',
    }
    return map[status] || map.ended
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
        >
          All Events
        </h2>
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium px-3 py-1"
            style={{
              color: 'var(--color-text-muted)',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-full)',
            }}
          >
            {displayed.length} of {events.length} event{events.length !== 1 ? 's' : ''}
          </span>
          <button onClick={exportCsv} className="pq-btn pq-btn-secondary" style={{ fontSize: '0.8125rem' }}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          className="pq-input"
          style={{ width: '220px' }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="pq-input"
          style={{ width: 'auto' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
          <option value="ended">Ended</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="pq-input"
          style={{ width: 'auto' }}
        >
          <option value="all">All Types</option>
          {eventTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="pq-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                <SortHeader label="Event" field="name" />
                <SortHeader label="Type" field="event_type" />
                <th className="pb-3 pt-1 text-left font-semibold text-xs uppercase tracking-wider px-4" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Code</th>
                <SortHeader label="Status" field="status" />
                <SortHeader label="Participants" field="participantCount" />
                <th className="pb-3 pt-1 text-left font-semibold text-xs uppercase tracking-wider px-4" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Completions</th>
                <SortHeader label="Rate" field="completionRate" />
                <SortHeader label="Date" field="start_time" />
              </tr>
            </thead>
            <tbody>
              {displayed.map((event) => (
                <tr
                  key={event.id}
                  style={{
                    borderBottom: '1px solid var(--color-border-light)',
                    transition: 'var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td className="py-3.5 px-4 font-medium" style={{ color: 'var(--color-text)' }}>
                    {event.name}
                  </td>
                  <td className="py-3.5 px-4 capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                    {event.event_type}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {event.event_code}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`capitalize ${statusBadgeClass(event.status)}`}>{event.status}</span>
                  </td>
                  <td className="py-3.5 px-4 font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {event.participantCount}
                  </td>
                  <td className="py-3.5 px-4" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-success)' }}>{event.completedMissions}</span>
                    <span style={{ color: 'var(--color-text-muted)' }}> / {event.totalMissions}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-16 h-1.5"
                        style={{
                          backgroundColor: 'var(--color-border-light)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${event.completionRate}%`,
                            height: '100%',
                            backgroundColor:
                              event.completionRate >= 75
                                ? 'var(--color-success)'
                                : event.completionRate >= 40
                                ? 'var(--color-warning)'
                                : 'var(--color-primary)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'var(--transition-base)',
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                        {event.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {displayed.length === 0 && (
        <div className="pq-card text-center py-12">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {events.length === 0 ? 'No events yet.' : 'No events match your filters.'}
          </p>
        </div>
      )}
    </div>
  )
}
