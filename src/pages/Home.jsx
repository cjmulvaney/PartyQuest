import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme.jsx'

const highlights = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    label: 'Secret missions for every guest',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
      </svg>
    ),
    label: 'Live leaderboard everyone can see',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M12 18h.01" />
      </svg>
    ),
    label: 'Guests join on their phone — no app needed',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>

      {/* Nav */}
      <header style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.25rem',
          fontWeight: 700,
          color: 'var(--color-primary)',
        }}>
          Party Quest
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/how-it-works')}
            className="pq-btn pq-btn-ghost"
            style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}
          >
            How it works
          </button>
          <button
            className="theme-toggle"
            data-active={theme === 'dark'}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          />
        </div>
      </header>

      {/* Hero */}
      <section style={{
        padding: '52px 24px 40px',
        textAlign: 'center',
        maxWidth: '480px',
        margin: '0 auto',
      }}>
        <div
          className="animate-scale-in"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: 'var(--radius-xl)',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>

        <h1
          className="animate-slide-up stagger-1"
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 8vw, 2.75rem)',
            fontWeight: 700,
            color: 'var(--color-text)',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
            margin: '0 0 14px',
          }}
        >
          The social game your guests will actually talk about.
        </h1>

        <p
          className="animate-slide-up stagger-2"
          style={{
            fontSize: '1rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.65,
            margin: '0 0 32px',
          }}
        >
          Secret missions. Live leaderboard. No app download.
          Set it up in minutes, play all night.
        </p>

        {/* CTAs */}
        <div className="animate-slide-up stagger-3" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => navigate('/organizer')}
            className="pq-btn pq-btn-primary"
            style={{
              width: '100%',
              fontSize: '1.0625rem',
              padding: '15px 24px',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            Host an Event
          </button>
          <button
            onClick={() => navigate('/join')}
            className="pq-btn pq-btn-ghost"
            style={{
              width: '100%',
              fontSize: '0.9375rem',
              padding: '13px 24px',
              borderRadius: 'var(--radius-xl)',
              border: '1.5px solid var(--color-border)',
            }}
          >
            Join an Event
          </button>
        </div>
      </section>

      {/* Highlights — scannable bullets */}
      <section style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '8px 24px 36px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {highlights.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>
                {item.icon}
              </span>
              <span style={{
                fontSize: '0.9375rem',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-body)',
                lineHeight: 1.4,
              }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Screenshot preview + How it works link */}
      <section style={{
        maxWidth: '480px',
        margin: '0 auto',
        padding: '0 24px 48px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '0.8125rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          marginBottom: '16px',
        }}>
          Set up takes about 5 minutes
        </p>

        {/* Screenshot */}
        <div style={{
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-border-light)',
          marginBottom: '20px',
        }}>
          <img
            src="/screenshots/org-create-event.png"
            alt="Creating an event in Party Quest"
            style={{ width: '100%', display: 'block' }}
            loading="lazy"
          />
        </div>

        {/* How it works CTA */}
        <button
          onClick={() => navigate('/how-it-works')}
          className="pq-btn pq-btn-secondary"
          style={{
            width: '100%',
            fontSize: '1rem',
            padding: '13px 24px',
            borderRadius: 'var(--radius-xl)',
          }}
        >
          See how it works →
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--color-border-light)',
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
      }}>
        <a href="/privacy" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          Privacy Policy
        </a>
        <a href="/terms" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          Terms of Service
        </a>
      </footer>

    </div>
  )
}
