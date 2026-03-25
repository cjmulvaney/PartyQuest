import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { useTheme } from '../../hooks/useTheme.jsx'
import { supabase } from '../../lib/supabase.js'

export default function Settings() {
  const navigate = useNavigate()
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [sending, setSending] = useState(false)

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="pq-spinner" />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    signInWithGoogle()
    return null
  }

  async function handleSendFeedback() {
    if (!feedbackText.trim()) return
    setSending(true)
    await supabase.from('feedback').insert({
      text: `[Organizer Feedback] ${feedbackText.trim()}`,
    })
    setFeedbackText('')
    setFeedbackSent(true)
    setSending(false)
    setTimeout(() => setFeedbackSent(false), 3000)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Back nav */}
        <button
          onClick={() => navigate('/organizer')}
          className="pq-btn pq-btn-ghost mb-6"
          style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '0.25rem 0' }}
        >
          &larr; Dashboard
        </button>

        <h1
          className="mb-8"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--color-text)',
          }}
        >
          Settings
        </h1>

        {/* Profile Section */}
        <div className="pq-card mb-6 animate-fade-in">
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginBottom: '1rem',
            }}
          >
            Profile
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div
              className="flex items-center justify-center"
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                color: 'var(--color-text-inverse)',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '1.25rem',
              }}
            >
              {user.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  fontSize: '1rem',
                  color: 'var(--color-text)',
                }}
              >
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'Organizer'}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                {user.email}
              </p>
            </div>
          </div>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.5,
            }}
          >
            Signed in with Google. Your profile information is managed through your Google account.
          </p>
        </div>

        {/* Appearance Section */}
        <div className="pq-card mb-6 animate-fade-in stagger-1">
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginBottom: '1rem',
            }}
          >
            Appearance
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.9375rem',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                }}
              >
                Dark Mode
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                {theme === 'dark' ? 'Currently using dark theme' : 'Currently using light theme'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="pq-btn pq-btn-secondary"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                padding: '0.5rem 1.25rem',
              }}
            >
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>

        {/* Help & Feedback Section */}
        <div className="pq-card mb-6 animate-fade-in stagger-2">
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginBottom: '1rem',
            }}
          >
            Help & Feedback
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.5,
              marginBottom: '1rem',
            }}
          >
            Have a question, found a bug, or want to suggest a feature? We'd love to hear from you.
          </p>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what's on your mind..."
            rows={4}
            className="pq-input w-full mb-3"
            style={{ resize: 'vertical', minHeight: '100px' }}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSendFeedback}
              disabled={!feedbackText.trim() || sending}
              className="pq-btn pq-btn-primary"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {sending ? 'Sending...' : 'Send Feedback'}
            </button>
            {feedbackSent && (
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: 'var(--color-success)',
                  fontWeight: 600,
                }}
              >
                Thanks for your feedback!
              </span>
            )}
          </div>
        </div>

        {/* Account Section */}
        <div className="pq-card animate-fade-in stagger-3">
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--color-text)',
              marginBottom: '1rem',
            }}
          >
            Account
          </h2>
          <button
            onClick={handleSignOut}
            className="pq-btn pq-btn-danger"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
