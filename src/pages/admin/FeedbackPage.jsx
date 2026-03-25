import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEvent, setFilterEvent] = useState('all')
  const [events, setEvents] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: fb }, { data: ev }] = await Promise.all([
      supabase
        .from('feedback')
        .select('id, text, created_at, event_id, participant_id, events(name), participants(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('id, name')
        .neq('status', 'draft')
        .order('name'),
    ])
    setFeedback(fb || [])
    setEvents(ev || [])
    setLoading(false)
  }

  const filtered =
    filterEvent === 'all'
      ? feedback
      : feedback.filter((f) => f.event_id === filterEvent)

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
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
          >
            Feedback
          </h2>
          <p
            className="text-sm mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {filtered.length} response{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="pq-input"
          style={{
            width: 'auto',
            minWidth: '200px',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Events ({feedback.length})</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} ({feedback.filter((f) => f.event_id === ev.id).length})
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div
          className="pq-card text-center py-12"
        >
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            No feedback yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="pq-card"
              style={{
                transition: 'var(--transition-fast)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-border-strong)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'var(--color-border)')
              }
            >
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--color-text)' }}
              >
                {f.text}
              </p>
              <div className="flex items-center gap-3 mt-3 pt-3"
                style={{ borderTop: '1px solid var(--color-border-light)' }}
              >
                {f.events?.name && (
                  <span className="pq-badge pq-badge-primary">
                    {f.events.name}
                  </span>
                )}
                {f.participants?.name && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    by {f.participants.name}
                  </span>
                )}
                <span
                  className="text-xs ml-auto"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {new Date(f.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
