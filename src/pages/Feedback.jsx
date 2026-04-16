import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

const QUESTIONS = [
  { key: 'rating', label: 'Overall, how would you rate your experience with the app?', type: 'stars', required: true },
  { key: 'enjoyment', label: 'Did Party Quest increase your enjoyment of the event?', type: 'pills', options: [{ label: 'Yes', value: 'yes' }, { label: 'Somewhat', value: 'somewhat' }, { label: 'No', value: 'no' }], required: true },
  { key: 'metSomeone', label: 'Did your missions cause you to have conversations you wouldn\'t have had, or help you meet someone new?', type: 'pills', options: [{ label: 'Yes', value: 'yes' }, { label: 'Kind of', value: 'kind_of' }, { label: 'No', value: 'no' }], required: true },
  { key: 'wouldRecommend', label: 'Would you recommend Party Quest to a friend who is planning an event?', type: 'pills', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }], required: true },
  { key: 'openText', label: 'Anything else you\'d like to share?', type: 'textarea', required: false },
]

export default function Feedback() {
  const { token } = useParams()
  const [phase, setPhase] = useState('loading')
  // 'loading' | 'form' | 'need_code' | 'already_submitted' | 'event_not_ended' | 'not_found' | 'submitted'
  const [participant, setParticipant] = useState(null)
  const [event, setEvent] = useState(null)
  const [accessCodeInput, setAccessCodeInput] = useState('')
  const [codeError, setCodeError] = useState('')
  // Survey answers
  const [rating, setRating] = useState(0)
  const [enjoyment, setEnjoyment] = useState('')
  const [metSomeone, setMetSomeone] = useState('')
  const [wouldRecommend, setWouldRecommend] = useState('')
  const [openText, setOpenText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    resolveToken()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function resolveToken() {
    if (!token) {
      setPhase('not_found')
      return
    }

    // Try as access_code (participant-specific link from SMS)
    const { data: part } = await supabase
      .from('participants')
      .select('id, name, event_id, survey_submitted')
      .eq('access_code', token.toUpperCase())
      .maybeSingle()

    if (part) {
      const { data: evt } = await supabase
        .from('events')
        .select('id, name, status')
        .eq('id', part.event_id)
        .single()

      if (!evt || evt.status !== 'ended') {
        setPhase('event_not_ended')
        return
      }
      if (part.survey_submitted) {
        setPhase('already_submitted')
        return
      }
      setParticipant(part)
      setEvent(evt)
      setPhase('form')
      return
    }

    // Try as event_code (in-room display URL / QR code)
    const { data: evt } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('event_code', token.toUpperCase())
      .maybeSingle()

    if (evt && evt.status === 'ended') {
      setEvent(evt)
      setPhase('need_code')
      return
    }

    setPhase('not_found')
  }

  async function handleAccessCodeSubmit() {
    setCodeError('')
    if (!accessCodeInput.trim()) return

    const { data: part } = await supabase
      .from('participants')
      .select('id, name, event_id, survey_submitted')
      .eq('access_code', accessCodeInput.trim().toUpperCase())
      .eq('event_id', event.id)
      .maybeSingle()

    if (!part) {
      setCodeError('Access code not found for this event. Check your code and try again.')
      return
    }
    if (part.survey_submitted) {
      setPhase('already_submitted')
      return
    }
    setParticipant(part)
    setPhase('form')
  }

  async function handleSubmit() {
    if (!rating || !enjoyment || !metSomeone || !wouldRecommend) {
      setSubmitError('Please answer all required questions.')
      return
    }
    setSubmitting(true)
    setSubmitError('')

    const { error } = await supabase.rpc('rpc_submit_survey', {
      p_participant_id: participant.id,
      p_event_id: event.id,
      p_rating: rating,
      p_increased_enjoyment: enjoyment,
      p_met_someone: metSomeone,
      p_would_recommend: wouldRecommend,
      p_open_text: openText || null,
    })

    if (error) {
      setSubmitError(error.message)
      setSubmitting(false)
      return
    }

    setPhase('submitted')
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="pq-spinner" />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
            Loading survey...
          </p>
        </div>
      </div>
    )
  }

  // ── Info screens (non-form states) ───────────────────────────────────────────

  if (phase === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="pq-card text-center animate-scale-in" style={{ maxWidth: '26rem', width: '100%' }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-success-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-success)' }}>
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>
            Thanks for your feedback!
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Your feedback helps us improve Party Quest. See you at the next event!
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'already_submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="pq-card text-center animate-fade-in" style={{ maxWidth: '26rem', width: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>
            Already submitted
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
            You've already submitted feedback for this event. Thanks!
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'event_not_ended') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="pq-card text-center animate-fade-in" style={{ maxWidth: '26rem', width: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>
            Event still in progress
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
            The feedback survey will be available after the event ends. Check back soon!
          </p>
        </div>
      </div>
    )
  }

  if (phase === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="pq-card text-center animate-fade-in" style={{ maxWidth: '26rem', width: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text)', marginBottom: '0.75rem' }}>
            Survey not found
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
            This link may be invalid or expired. Ask your event organizer for the correct link.
          </p>
        </div>
      </div>
    )
  }

  // ── Need access code (event code flow) ───────────────────────────────────────

  if (phase === 'need_code') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="pq-card animate-scale-in" style={{ maxWidth: '26rem', width: '100%' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', marginBottom: '4px' }}>
              Post-Event Survey
            </p>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text)' }}>
              {event?.name}
            </h2>
          </div>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-body)', marginBottom: '1rem' }}>
            Enter your personal access code to continue:
          </p>
          <input
            type="text"
            value={accessCodeInput}
            onChange={(e) => setAccessCodeInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAccessCodeSubmit() }}
            placeholder="Your access code"
            className="pq-input w-full"
            style={{ fontFamily: 'monospace', letterSpacing: '0.08em', fontSize: '1rem', marginBottom: '0.75rem' }}
            autoFocus
          />
          {codeError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>
              {codeError}
            </p>
          )}
          <button
            onClick={handleAccessCodeSubmit}
            disabled={!accessCodeInput.trim()}
            className="pq-btn pq-btn-primary w-full"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  // ── Survey form ───────────────────────────────────────────────────────────────

  const answers = { rating, enjoyment, metSomeone, wouldRecommend, openText }

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div style={{ maxWidth: '28rem', margin: '0 auto' }}>
        {/* Header */}
        <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', marginBottom: '4px' }}>
            Post-Event Survey
          </p>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text)', marginBottom: '4px' }}>
            {event?.name}
          </h1>
          {participant?.name && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
              Hey, {participant.name}!
            </p>
          )}
        </div>

        <div className="pq-card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          {QUESTIONS.map((q) => (
            <div key={q.key}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-text)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {q.label}
                {!q.required && (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontWeight: 400, marginLeft: '0.4rem' }}>
                    (optional)
                  </span>
                )}
              </p>

              {q.type === 'stars' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '2rem',
                        lineHeight: 1,
                        color: star <= rating ? 'var(--color-primary)' : 'var(--color-border)',
                        transition: 'var(--transition-fast)',
                        padding: '0 2px',
                      }}
                      aria-label={`${star} star${star !== 1 ? 's' : ''}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}

              {q.type === 'pills' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {q.options.map((opt) => {
                    const isActive = answers[q.key] === opt.value
                    const setter = q.key === 'enjoyment' ? setEnjoyment
                      : q.key === 'metSomeone' ? setMetSomeone
                      : setWouldRecommend
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setter(opt.value)}
                        className="pq-btn"
                        style={{
                          backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
                          color: isActive ? '#fff' : 'var(--color-text-secondary)',
                          border: `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          fontWeight: isActive ? 600 : 400,
                          transition: 'var(--transition-fast)',
                          padding: '0.375rem 1rem',
                          fontSize: '0.875rem',
                          minHeight: 'auto',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {q.type === 'textarea' && (
                <textarea
                  value={openText}
                  onChange={(e) => setOpenText(e.target.value)}
                  placeholder="Share your thoughts... (optional)"
                  className="pq-input"
                  rows={3}
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
                />
              )}
            </div>
          ))}

          {submitError && (
            <p style={{ color: 'var(--color-danger)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
              {submitError}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="pq-btn pq-btn-primary w-full"
            style={{ padding: '0.75rem', fontSize: '1rem' }}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}
