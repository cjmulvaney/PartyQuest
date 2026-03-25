import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name, event_type, status, start_time, end_time, event_code, created_at, organizer_id')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    if (!data) {
      setLoading(false)
      return
    }

    // Get participant counts and completion stats
    const enriched = await Promise.all(
      data.map(async (event) => {
        const [{ count: participantCount }, { data: completions }] = await Promise.all([
          supabase
            .from('participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id),
          supabase
            .from('participant_missions')
            .select('completed, participant_id')
            .in(
              'participant_id',
              (
                await supabase
                  .from('participants')
                  .select('id')
                  .eq('event_id', event.id)
              ).data?.map((p) => p.id) || []
            ),
        ])

        const totalMissions = completions?.length || 0
        const completedMissions = completions?.filter((c) => c.completed).length || 0
        const completionRate =
          totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0

        return {
          ...event,
          participantCount: participantCount || 0,
          totalMissions,
          completedMissions,
          completionRate,
        }
      })
    )

    setEvents(enriched)
    setLoading(false)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2
          className="text-2xl font-bold"
          style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
        >
          All Events
        </h2>
        <span
          className="text-sm font-medium px-3 py-1"
          style={{
            color: 'var(--color-text-muted)',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-full)',
          }}
        >
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        className="pq-card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  borderBottom: '2px solid var(--color-border)',
                }}
              >
                {['Event', 'Type', 'Code', 'Status', 'Participants', 'Completions', 'Rate', 'Date'].map(
                  (header) => (
                    <th
                      key={header}
                      className="pb-3 pt-1 text-left font-semibold text-xs uppercase tracking-wider px-4"
                      style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
                    >
                      {header}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr
                  key={event.id}
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
                    {event.name}
                  </td>
                  <td
                    className="py-3.5 px-4 capitalize"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {event.event_type}
                  </td>
                  <td
                    className="py-3.5 px-4 font-mono text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {event.event_code}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`capitalize ${statusBadgeClass(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td
                    className="py-3.5 px-4 font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {event.participantCount}
                  </td>
                  <td
                    className="py-3.5 px-4"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
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
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'var(--color-text-muted)' }}
                      >
                        {event.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td
                    className="py-3.5 px-4 text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {new Date(event.start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {events.length === 0 && (
        <div
          className="pq-card text-center py-12"
        >
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No events yet.
          </p>
        </div>
      )}
    </div>
  )
}
