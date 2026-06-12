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
  const APP_URL = (import.meta.env.VITE_APP_URL || window.location.origin).trim()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: fetchError } = await supabase
      .from('events_public')
      .select('id, name, event_code, anonymity_enabled, status, feed_mode, feed_photos_enabled, feed_comments_enabled, feed_reactions_enabled, feed_interactive_comments_enabled, feed_hidden')
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
    const registerLink = `${APP_URL}/register/${event.event_code}`
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', padding: '1.5rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto' }}>
          {/* Projector header bar — readable from across the room */}
          <div
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.5rem',
              flexWrap: 'wrap',
              background: 'var(--color-primary-subtle)',
              border: '1px solid var(--color-primary-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem 1.75rem',
              marginBottom: '1.75rem',
            }}
          >
            {/* Event name */}
            <div style={{ minWidth: 0 }}>
              <p style={{ color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                Party Quest · Live
              </p>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(1.75rem, 4vw, 3rem)', color: 'var(--color-text)', margin: 0, lineHeight: 1.05 }}>
                {event.name}
              </h1>
            </div>

            {/* Join: big code + QR */}
            <div className="flex items-center" style={{ gap: '1.5rem' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', marginBottom: '0.15rem' }}>
                  Join at {APP_URL.replace(/^https?:\/\//, '')}
                </p>
                <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 'clamp(2rem, 5vw, 3.5rem)', color: 'var(--color-primary)', letterSpacing: '0.12em', lineHeight: 1, margin: 0 }}>
                  {event.event_code}
                </p>
              </div>
              <div
                style={{
                  background: '#fff',
                  padding: '0.5rem',
                  borderRadius: 'var(--radius-md)',
                  lineHeight: 0,
                  flexShrink: 0,
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=0&data=${encodeURIComponent(registerLink)}`}
                  alt="Scan to join"
                  width={120}
                  height={120}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
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
            {!event.feed_hidden && (
              <div>
                <ActivityFeed
                  eventId={event.id}
                  feedMode={event.feed_mode || 'secret'}
                  showPhotos={event.feed_photos_enabled !== false}
                  showComments={event.feed_comments_enabled !== false}
                  showReactions={event.feed_reactions_enabled !== false}
                  showInteractiveComments={event.feed_interactive_comments_enabled === true}
                />
              </div>
            )}
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

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.6rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 0.9rem',
            }}
          >
            <span style={{ fontSize: '1.1rem', lineHeight: 1.2 }} aria-hidden="true">📺</span>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem', margin: 0, lineHeight: 1.45 }}>
              <strong style={{ color: 'var(--color-text)' }}>Cast this on the TV.</strong> Open it on a laptop and AirPlay or screen-mirror to your TV — guests can scan the on-screen code to join mid-party.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
