import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function FeedbackButton({ eventId, participantId }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return

    await supabase.from('feedback').insert({
      event_id: eventId || null,
      participant_id: participantId || null,
      text: text.trim(),
    })

    setText('')
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setOpen(false)
    }, 2000)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '4.5rem',
          right: '1rem',
          zIndex: 40,
          backgroundColor: 'var(--color-navy)',
          color: 'var(--color-text-inverse)',
          fontSize: '0.75rem',
          fontWeight: 600,
          fontFamily: 'var(--font-body)',
          padding: '8px 14px',
          borderRadius: 'var(--radius-full)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-lg)',
          transition: 'transform var(--transition-fast), opacity var(--transition-fast)',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        Feedback
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
          />
          <div
            className="animate-slide-up"
            style={{
              position: 'relative',
              backgroundColor: 'var(--color-surface)',
              borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
              width: '100%',
              maxWidth: '24rem',
              margin: '0 auto',
              padding: '1.5rem',
            }}
          >
            {submitted ? (
              <p
                className="text-center"
                style={{
                  color: 'var(--color-success)',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  padding: '1rem 0',
                }}
              >
                Thanks for your feedback!
              </p>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    color: 'var(--color-text)',
                    margin: 0,
                  }}
                >
                  Share Feedback
                </h3>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="How's it going? Any suggestions?"
                  rows={4}
                  className="pq-input"
                  style={{ resize: 'none', fontSize: '0.9rem' }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    className="pq-btn pq-btn-primary"
                    style={{ flex: 1 }}
                  >
                    Send
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="pq-btn pq-btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
