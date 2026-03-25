import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Register() {
  const { eventCode } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)
  const [copyToast, setCopyToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')

  function copyWithToast(text, label, key) {
    navigator.clipboard?.writeText(text)
    setCopyToast(label || 'Copied!')
    setTimeout(() => setCopyToast(''), 2000)
    if (key) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 2000)
    }
  }

  // Form fields
  const [name, setName] = useState('')

  useEffect(() => {
    async function loadEvent() {
      const code = eventCode.toUpperCase().trim()
      const { data, error: err } = await supabase
        .from('events')
        .select('id, name, event_type, start_time, end_time, status, max_participants')
        .eq('event_code', code)
        .single()

      if (err || !data) {
        setError('Event not found. Check your invite link.')
        setLoading(false)
        return
      }

      if (data.status === 'ended') {
        setError('This event has already ended.')
        setLoading(false)
        return
      }

      setEvent(data)
      setLoading(false)
    }
    loadEvent()
  }, [eventCode])

  async function handleRegister(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Check max participants
      if (event.max_participants) {
        const { count } = await supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('is_active', true)

        if (count >= event.max_participants) {
          setError('This event is full. No more spots available.')
          setSubmitting(false)
          return
        }
      }

      const accessCode = generateCode(6)

      const { data: participant, error: partErr } = await supabase
        .from('participants')
        .insert({
          event_id: event.id,
          name: name.trim(),
          access_code: accessCode,
          joined_at: new Date().toISOString(),
          source: 'self',
        })
        .select()
        .single()

      if (partErr) throw partErr

      // If event is active, assign missions immediately
      if (event.status === 'active') {
        const { data: config } = await supabase
          .from('event_config')
          .select('*')
          .eq('event_id', event.id)
          .single()

        if (config) {
          await assignMissions(participant, config)
        }
      }

      setSuccess({ accessCode, participantId: participant.id })
    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.')
    }

    setSubmitting(false)
  }

  async function assignMissions(participant, config) {
    let query = supabase
      .from('missions')
      .select('id')
      .eq('active', true)

    if (config.tag_filters?.length > 0) {
      query = query.in('category_id', config.tag_filters)
    }

    const { data: missions } = await query
    if (!missions || missions.length === 0) return

    const shuffled = [...missions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, config.mission_count)

    const rows = selected.map((m) => ({
      participant_id: participant.id,
      mission_id: m.id,
    }))

    if (rows.length > 0) {
      await supabase.from('participant_missions').insert(rows)
    }
  }

  // --- Loading state ---
  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="pq-spinner" style={{ width: 40, height: 40 }} />
        <p
          className="mt-4 font-body"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          Loading event...
        </p>
      </div>
    )
  }

  // --- Fatal error (no event loaded) ---
  if (error && !event) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="pq-card animate-fade-in text-center max-w-sm w-full p-8">
          <div
            className="mx-auto mb-4 flex items-center justify-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-danger)',
              color: 'var(--color-text-inverse)',
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <p
            className="text-lg font-semibold mb-2"
            style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-heading)' }}
          >
            Oops
          </p>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="pq-btn pq-btn-ghost"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Go home
          </button>
        </div>
      </div>
    )
  }

  // --- Success state ---
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4 py-8"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="max-w-sm w-full animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Celebratory header */}
          <div className="text-center">
            <h1
              className="text-3xl font-bold"
              style={{ color: 'var(--color-success)', fontFamily: 'var(--font-heading)' }}
            >
              You're in!
            </h1>
            <p className="mt-1" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
              Welcome to {event.name}
            </p>
          </div>

          {/* Access code card */}
          <div
            className="pq-card p-6 text-center"
            style={{
              background: 'var(--color-success-light)',
              border: '2px solid var(--color-success)',
            }}
          >
            <p
              className="text-sm font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'var(--color-success)', fontFamily: 'var(--font-body)', letterSpacing: '0.08em' }}
            >
              Your Access Code
            </p>
            <p
              className="font-bold tracking-widest"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '2.5rem',
                lineHeight: 1.2,
                color: 'var(--color-navy)',
                letterSpacing: '0.2em',
              }}
            >
              {success.accessCode}
            </p>
            <p className="mt-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Save this code -- you will need it to rejoin
            </p>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => navigate(`/play/${success.accessCode}`)}
            className="pq-btn pq-btn-primary w-full"
            style={{
              padding: '14px 0',
              fontSize: '1.1rem',
              fontFamily: 'var(--font-heading)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            Start Playing
          </button>

          <button
            onClick={() => copyWithToast(success.accessCode, 'Access code copied!', 'accessCode')}
            className="pq-btn pq-btn-secondary w-full"
            style={{
              padding: '14px 0',
              fontFamily: 'var(--font-body)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {copiedKey === 'accessCode' ? 'Copied!' : 'Copy Access Code'}
          </button>
        </div>

        {/* Copy toast */}
        {copyToast && (
          <div className="pq-toast fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
            <div className="pq-toast-inner">
              {copyToast}
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- Registration form ---
  const eventDate = new Date(event.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'var(--color-bg)' }}
    >
      <div className="max-w-sm w-full animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Invitation header */}
        <div className="text-center">
          <p
            className="text-sm font-semibold uppercase tracking-wider mb-1"
            style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-body)', letterSpacing: '0.1em' }}
          >
            You're Invited
          </p>
          <h1
            className="text-3xl font-bold"
            style={{ color: 'var(--color-navy)', fontFamily: 'var(--font-heading)' }}
          >
            Party Quest
          </h1>
        </div>

        {/* Event info card */}
        <div
          className="pq-card text-center p-6"
          style={{
            borderTop: '4px solid var(--color-accent)',
          }}
        >
          <h2
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--color-navy)', fontFamily: 'var(--font-heading)' }}
          >
            {event.name}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              className="pq-badge pq-badge-primary"
              style={{ textTransform: 'capitalize' }}
            >
              {event.event_type}
            </span>
            <span className="pq-badge pq-badge-muted">
              {eventDate}
            </span>
          </div>
        </div>

        {/* Registration form card */}
        <div className="pq-card p-6">
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
              >
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="pq-input w-full"
                autoFocus
              />
            </div>

            {error && (
              <p
                className="text-sm font-medium"
                style={{
                  color: 'var(--color-danger)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="pq-btn pq-btn-primary w-full"
              style={{
                padding: '14px 0',
                fontSize: '1.1rem',
                fontFamily: 'var(--font-heading)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="pq-spinner" style={{ width: 18, height: 18 }} />
                  Registering...
                </span>
              ) : (
                'Join Event'
              )}
            </button>
          </form>
        </div>

        <p
          className="text-center text-xs"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
        >
          By joining, you'll receive missions to complete during the event.
        </p>
      </div>
    </div>
  )
}

function generateCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
