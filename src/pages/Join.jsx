import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Join() {
  const navigate = useNavigate()
  const [eventCode, setEventCode] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const evCode = eventCode.toUpperCase().trim()
    const acCode = accessCode.toUpperCase().trim()

    // Look up the event
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('event_code', evCode)
      .single()

    if (eventErr || !event) {
      setError('Event not found. Check your event code.')
      setLoading(false)
      return
    }

    if (event.status === 'ended') {
      setError('This event has already ended.')
      setLoading(false)
      return
    }

    // Look up the participant by access code within this event
    const { data: participant, error: partErr } = await supabase
      .from('participants')
      .select('id, access_code, joined_at')
      .eq('event_id', event.id)
      .eq('access_code', acCode)
      .single()

    if (partErr || !participant) {
      setError('Access code not found for this event. Check both codes and try again.')
      setLoading(false)
      return
    }

    // Mark as joined if first time
    if (!participant.joined_at) {
      await supabase
        .from('participants')
        .update({ joined_at: new Date().toISOString() })
        .eq('id', participant.id)
    }

    setLoading(false)
    navigate(`/play/${participant.access_code}`)
  }

  const isDisabled = loading || eventCode.trim().length < 3 || accessCode.trim().length < 3

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Subtle decorative gradient */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'var(--color-primary-subtle)',
          opacity: 0.4,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div className="max-w-sm w-full relative z-10 animate-fade-in" style={{ padding: '24px 0' }}>
        {/* Back link */}
        <button
          onClick={() => navigate('/')}
          className="pq-btn pq-btn-ghost animate-fade-in"
          style={{
            padding: '6px 12px',
            fontSize: '0.875rem',
            marginBottom: '24px',
            color: 'var(--color-text-muted)',
            gap: '4px',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        {/* Header */}
        <div className="mb-8 animate-slide-up stagger-1">
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Join Event
          </h1>
          <p
            className="mt-2"
            style={{
              fontSize: '0.9375rem',
              color: 'var(--color-text-secondary)',
              margin: '8px 0 0',
            }}
          >
            Enter the codes from your host to get started.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleJoin} className="space-y-5">
          {/* Event Code */}
          <div className="animate-slide-up stagger-2">
            <label
              htmlFor="event-code"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '6px',
              }}
            >
              Event Code
            </label>
            <input
              id="event-code"
              type="text"
              value={eventCode}
              onChange={(e) => setEventCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="pq-input"
              style={{
                textAlign: 'center',
                fontSize: '1.5rem',
                fontFamily: 'monospace',
                letterSpacing: '0.2em',
                padding: '14px 16px',
              }}
              autoFocus
              autoComplete="off"
            />
            <p
              className="mt-1"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-muted)',
                margin: '4px 0 0',
              }}
            >
              The 6-character code for the event
            </p>
          </div>

          {/* Access Code */}
          <div className="animate-slide-up stagger-3">
            <label
              htmlFor="access-code"
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '6px',
              }}
            >
              Your Access Code
            </label>
            <input
              id="access-code"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="MYCODE01"
              maxLength={8}
              className="pq-input"
              style={{
                textAlign: 'center',
                fontSize: '1.5rem',
                fontFamily: 'monospace',
                letterSpacing: '0.2em',
                padding: '14px 16px',
              }}
              autoComplete="off"
            />
            <p
              className="mt-1"
              style={{
                fontSize: '0.8125rem',
                color: 'var(--color-text-muted)',
                margin: '4px 0 0',
              }}
            >
              Your personal code -- unique to you
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="animate-scale-in"
              style={{
                padding: '10px 14px',
                background: 'var(--color-danger-light)',
                color: 'var(--color-danger)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isDisabled}
            className="pq-btn pq-btn-primary animate-slide-up stagger-4"
            style={{
              width: '100%',
              fontSize: '1.0625rem',
              padding: '14px 24px',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="pq-spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                Joining...
              </span>
            ) : (
              'Join Event'
            )}
          </button>
        </form>

        {/* Footer help text */}
        <p
          className="text-center mt-6 animate-fade-in stagger-5"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
          }}
        >
          Your host will share these codes with you. Ask them if you don't have them!
        </p>
      </div>
    </div>
  )
}
