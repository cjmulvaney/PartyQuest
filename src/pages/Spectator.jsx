import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useTheme } from '../hooks/useTheme.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import ActivityFeed from '../components/ActivityFeed.jsx'

export default function Spectator() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [eventCode, setEventCode] = useState('')
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: fetchError } = await supabase
      .from('events')
      .select('id, name, anonymity_enabled, status, feed_mode')
      .eq('event_code', eventCode.toUpperCase().trim())
      .in('status', ['active', 'upcoming'])
      .single()

    setLoading(false)

    if (fetchError || !data) {
      setError('Event not found. Check the code and try again.')
      return
    }

    setEvent(data)
  }

  if (event) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', padding: '1.5rem 1rem 2rem' }}>
        <div style={{ maxWidth: '56rem', margin: '0 auto' }}>
          {/* Header */}
          <div className="flex items-start justify-between animate-fade-in" style={{ marginBottom: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', marginBottom: '2px' }}>
                Spectator View
              </p>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.75rem', color: 'var(--color-text)', margin: 0 }}>
                {event.name}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="theme-toggle"
                data-active={theme === 'dark'}
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
              />
              <button
                onClick={() => setEvent(null)}
                className="pq-btn pq-btn-ghost"
                style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
              >
                Exit
              </button>
            </div>
          </div>

          {/* Combined layout: Leaderboard + Feed side by side on desktop, stacked on mobile */}
          <div
            className="animate-slide-up"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 20rem), 1fr))',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            {/* Leaderboard */}
            <div>
              <Leaderboard
                eventId={event.id}
                anonymity={event.anonymity_enabled}
                fullscreen
              />
            </div>

            {/* Activity Feed */}
            <div>
              <ActivityFeed
                eventId={event.id}
                feedMode={event.feed_mode || 'secret'}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '24rem', width: '100%' }}>
        <button
          onClick={() => navigate('/')}
          className="pq-btn pq-btn-ghost animate-fade-in"
          style={{ padding: '6px 0', fontSize: '0.85rem', minHeight: 'auto', marginBottom: '1.5rem' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.75rem', color: 'var(--color-text)', margin: '0 0 0.5rem' }}>
              Spectator View
            </h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Enter the event code to watch the leaderboard and activity feed in real time.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="text"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.toUpperCase())}
              placeholder="EVENT CODE"
              maxLength={6}
              className="pq-input"
              style={{
                textAlign: 'center',
                fontSize: '1.5rem',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '0.2em',
                fontWeight: 600,
                padding: '14px',
              }}
              autoFocus
            />

            {error && (
              <p className="animate-scale-in" style={{ color: 'var(--color-danger)', fontSize: '0.85rem', margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || eventCode.trim().length < 3}
              className="pq-btn pq-btn-primary"
              style={{ width: '100%', fontSize: '1rem', padding: '12px' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="pq-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Loading...
                </span>
              ) : 'Watch Event'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
