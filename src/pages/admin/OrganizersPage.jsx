import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function OrganizersPage() {
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrganizers()
  }, [])

  async function loadOrganizers() {
    // Get all events grouped by organizer
    const { data: events } = await supabase
      .from('events')
      .select('organizer_id, id, status')
      .neq('status', 'draft')

    if (!events || events.length === 0) {
      setOrganizers([])
      setLoading(false)
      return
    }

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

    // Try to get user emails from auth (may not work without service role key)
    // Fall back to organizer_email from events
    const orgIds = Object.keys(byOrganizer)
    const { data: emailEvents } = await supabase
      .from('events')
      .select('organizer_id, organizer_email')
      .in('organizer_id', orgIds)
      .not('organizer_email', 'is', null)

    const emailMap = {}
    emailEvents?.forEach((e) => {
      if (e.organizer_email) emailMap[e.organizer_id] = e.organizer_email
    })

    const list = Object.values(byOrganizer).map((org) => ({
      ...org,
      email: emailMap[org.id] || org.id.substring(0, 8) + '...',
    }))

    setOrganizers(list)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="pq-spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
          {organizers.length} organizer{organizers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {organizers.length === 0 ? (
        <div
          className="pq-card text-center py-12"
        >
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No organizers yet.
          </p>
        </div>
      ) : (
        <div className="pq-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid var(--color-border)',
                  }}
                >
                  {['Email / ID', 'Total Events', 'Active Events'].map((header) => (
                    <th
                      key={header}
                      className="pb-3 pt-1 text-left font-semibold text-xs uppercase tracking-wider px-4"
                      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {organizers.map((org) => (
                  <tr
                    key={org.id}
                    style={{
                      borderBottom: '1px solid var(--color-border-light)',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = 'transparent')
                    }
                  >
                    <td
                      className="py-3.5 px-4 font-medium"
                      style={{ color: 'var(--color-text)' }}
                    >
                      {org.email}
                    </td>
                    <td
                      className="py-3.5 px-4"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
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
                    <td
                      className="py-3.5 px-4"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {org.activeCount > 0 ? (
                        <span className="pq-badge pq-badge-success">
                          {org.activeCount} active
                        </span>
                      ) : (
                        <span className="pq-badge pq-badge-muted">
                          none
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
