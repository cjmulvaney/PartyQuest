import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { selectMissionsForParticipant } from '../lib/missions.js'
import { normalizePhone } from '../lib/phone.js'

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

  async function copyWithToast(text, label, key) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyToast(label || 'Copied!')
      setTimeout(() => setCopyToast(''), 2000)
      if (key) {
        setCopiedKey(key)
        setTimeout(() => setCopiedKey(''), 2000)
      }
    } catch {
      // Clipboard API failed (non-HTTPS or denied) — don't show false success
    }
  }

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [smsSent, setSmsSent] = useState(false)
  const [showPhoneWarning, setShowPhoneWarning] = useState(false)

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

      if (data.status !== 'active' && data.status !== 'upcoming') {
        setError("This event isn't open yet. Come back when your host has started the event.")
        setLoading(false)
        return
      }

      setEvent(data)
      setLoading(false)
    }
    loadEvent()
  }, [eventCode])

  function handleFormSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    // If no phone number, show warning first
    const normalizedPhone = normalizePhone(phone)
    if (!normalizedPhone && !showPhoneWarning) {
      setShowPhoneWarning(true)
      return
    }

    setShowPhoneWarning(false)
    doRegister()
  }

  async function doRegister() {
    setSubmitting(true)
    setError('')

    try {
      // Atomic registration via RPC — handles duplicate names, max participants, and access code collisions
      const normalizedPhone = normalizePhone(phone)
      const { data: rpcResult, error: rpcErr } = await supabase.rpc('rpc_register_participant', {
        p_event_code: eventCode.toUpperCase().trim(),
        p_name: name.trim(),
        p_phone: normalizedPhone || null,
      })

      if (rpcErr) {
        // Map RPC error messages to user-friendly strings
        const msg = rpcErr.message || ''
        if (msg.includes('Name already taken')) {
          setError(`Sorry, "${name.trim()}" is already taken. Consider adding a last initial to stand out — e.g. "${name.trim()} S."`)
        } else if (msg.includes('Event is full')) {
          setError('This event is full. No more spots available.')
        } else if (msg.includes('not open yet')) {
          setError("This event isn't open yet. Come back when your host has started the event.")
        } else {
          setError(msg || 'Failed to register. Please try again.')
        }
        setSubmitting(false)
        return
      }

      const participant = rpcResult
      const accessCode = participant.access_code

      // If event is active, assign missions immediately
      if (event.status === 'active') {
        const { data: config } = await supabase
          .from('event_config')
          .select('*')
          .eq('event_id', event.id)
          .single()

        if (config) {
          try {
            await assignMissions(participant, config)
          } catch (missionErr) {
            console.error('Mission assignment failed:', missionErr)
            // Participant is registered but missions failed — still show success
            // The organizer can assign missions manually from the dashboard
          }
        }
      }

      // Fire-and-forget SMS if phone was provided
      if (normalizedPhone) {
        supabase.functions.invoke('send-participant-sms', {
          body: {
            participantId: participant.id,
            phone: normalizedPhone,
            name: name.trim(),
            accessCode,
            eventName: event.name,
            eventCode: eventCode.toUpperCase().trim(),
            scenario: 'self_register',
          },
        }).then(() => setSmsSent(true)).catch(() => {})
      }

      setSuccess({ accessCode, participantId: participant.id })
    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.')
    }

    setSubmitting(false)
  }

  async function assignMissions(participant, config) {
    // Try with tag filters first, fallback to all missions if none match
    let missions = null

    if (config.tag_filters?.length > 0) {
      const { data } = await supabase
        .from('missions')
        .select('id, category_id')
        .eq('active', true)
        .in('category_id', config.tag_filters)
      missions = data
    }

    // Fallback: if no missions matched the tag filter, try all active missions
    if (!missions || missions.length === 0) {
      const { data } = await supabase
        .from('missions')
        .select('id, category_id')
        .eq('active', true)
      missions = data
    }

    if (!missions || missions.length === 0) return

    // Get existing assignment counts across all participants in this event
    // so we can use leveled round-robin (least-assigned missions first)
    const { data: allEventParticipants } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', event.id)
      .eq('is_active', true)

    const eventParticipantIds = (allEventParticipants || []).map((p) => p.id)

    const assignmentCounts = {}
    missions.forEach((m) => (assignmentCounts[m.id] = 0))

    if (eventParticipantIds.length > 0) {
      const { data: existingAssignments } = await supabase
        .from('participant_missions')
        .select('mission_id')
        .in('participant_id', eventParticipantIds)

      if (existingAssignments) {
        existingAssignments.forEach((a) => {
          if (assignmentCounts[a.mission_id] !== undefined) {
            assignmentCounts[a.mission_id]++
          }
        })
      }
    }

    // Late joiner: best-effort balance against whatever's left in the pool.
    const mode = config.allocation_mode || 'balanced'
    const selected = selectMissionsForParticipant(
      mode,
      missions,
      config.mission_count,
      assignmentCounts,
      {},
      new Set()
    )

    const rows = selected.map((m) => ({
      participant_id: participant.id,
      mission_id: m.id,
    }))

    if (rows.length > 0) {
      const { error: insertErr } = await supabase.rpc('rpc_assign_participant_missions', {
        p_participant_id: participant.id,
        p_mission_ids: selected.map((m) => m.id),
      })
      if (insertErr) throw insertErr
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
              {smsSent ? 'Access code sent to your phone!' : 'Save this code -- you will need it to rejoin'}
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
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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

            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
              >
                Phone{' '}
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(optional)</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setShowPhoneWarning(false) }}
                placeholder="(555) 123-4567"
                className="pq-input w-full"
              />
              <p className="mt-1" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                Get your access code by text
              </p>
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

            {showPhoneWarning && (
              <div
                style={{
                  background: 'var(--color-warning-light, rgba(255, 193, 7, 0.12))',
                  border: '1px solid var(--color-warning, #f59e0b)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.875rem 1rem',
                }}
              >
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: 'var(--color-warning, #f59e0b)', fontFamily: 'var(--font-heading)' }}
                >
                  No phone number entered
                </p>
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.5 }}
                >
                  Without a phone number, you'll need to get your access code directly from your event organizer. Enter your phone number above to have it texted to you instead.
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    type="submit"
                    className="pq-btn pq-btn-secondary flex-1"
                    style={{ fontSize: '0.875rem', padding: '0.5rem 0' }}
                  >
                    Join without phone
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="pq-btn pq-btn-primary w-full"
              style={{
                display: showPhoneWarning ? 'none' : undefined,
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
