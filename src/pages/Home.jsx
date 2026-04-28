import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme.jsx'

const steps = [
  {
    number: '1',
    title: 'Get Your Invite',
    description: 'Your host creates an event and sends you a link or access code.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 4L12 13L2 4" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Receive Secret Missions',
    description: 'Start conversations, pull off dares, or share stories -- all in secret.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Complete & Earn Points',
    description: 'Check off missions during the event and rack up points.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    number: '4',
    title: 'Climb the Leaderboard',
    description: 'Watch the live rankings and see who comes out on top.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  return (
    <div
      className="pq-bg-texture min-h-screen flex flex-col items-center px-4 py-8 relative overflow-hidden"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Decorative background shapes */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-80px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'var(--color-primary-subtle)',
          opacity: 0.6,
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '200px',
          left: '-100px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'var(--color-secondary-light)',
          opacity: 0.5,
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: '100px',
          right: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'var(--color-accent-light)',
          opacity: 0.5,
          filter: 'blur(50px)',
          pointerEvents: 'none',
        }}
      />

      {/* Dark mode toggle */}
      <div className="w-full max-w-md flex justify-end relative z-10 animate-fade-in">
        <button
          className="theme-toggle"
          data-active={theme === 'dark'}
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        />
      </div>

      <div className="max-w-md w-full flex flex-col items-center relative z-10 flex-1">
        {/* Hero */}
        <div className="text-center mt-8 mb-10 animate-fade-in">
          {/* Decorative accent dot */}
          <div
            className="mx-auto mb-5 animate-scale-in"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9l6 6 6-6" />
              <path d="M12 3v12" />
              <path d="M5 21h14" />
            </svg>
          </div>

          <h1
            className="animate-slide-up stagger-1"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.5rem, 8vw, 3.5rem)',
              fontWeight: 700,
              color: 'var(--color-text)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Party Quest
          </h1>

          <p
            className="animate-slide-up stagger-2 mt-4"
            style={{
              fontSize: '1.125rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              maxWidth: '320px',
              margin: '16px auto 0',
            }}
          >
            Secret missions. Live leaderboard.
            <br />
            Make your next event{' '}
            <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              unforgettable
            </span>
            .
          </p>
          <p
            className="animate-slide-up stagger-2"
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-muted)',
              lineHeight: 1.6,
              maxWidth: '280px',
              margin: '10px auto 0',
            }}
          >
            Your host gives everyone secret social missions to complete during the event — things to say, do, or pull off. Finish them, earn points, and see where you land on the live leaderboard.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={() => navigate('/join')}
          className="pq-btn pq-btn-primary animate-scale-in stagger-3"
          style={{
            width: '100%',
            fontSize: '1.125rem',
            padding: '14px 24px',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-glow)',
          }}
        >
          Join Event
        </button>

        {/* How it works */}
        <div className="w-full mt-12 animate-slide-up stagger-4">
          <h2
            className="mb-5"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-text)',
              textAlign: 'center',
            }}
          >
            How it works
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {steps.map((step, i) => (
              <div
                key={step.number}
                className={`pq-card animate-slide-up stagger-${i + 3}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  padding: '20px 14px',
                }}
              >
                {/* Step icon */}
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    background: i === 0 ? 'var(--color-primary-light)' :
                                i === 1 ? 'var(--color-secondary-light)' :
                                i === 2 ? 'var(--color-accent-light)' :
                                          'var(--color-primary-subtle)',
                    color: i === 0 ? 'var(--color-primary)' :
                           i === 1 ? 'var(--color-secondary)' :
                           i === 2 ? 'var(--color-accent-hover)' :
                                     'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '10px',
                    flexShrink: 0,
                  }}
                >
                  {step.icon}
                </div>

                {/* Step number badge */}
                <span
                  className="pq-badge pq-badge-muted"
                  style={{ fontSize: '11px', marginBottom: '6px' }}
                >
                  Step {step.number}
                </span>

                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    margin: '0 0 4px',
                  }}
                >
                  {step.title}
                </h3>

                <p
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.4,
                    margin: 0,
                  }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Organizer section */}
        <div
          className="w-full mt-10 pt-8 animate-fade-in stagger-6"
          style={{ borderTop: '1px solid var(--color-border-light)' }}
        >
          <h3
            className="mb-4 text-center"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1rem',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
            }}
          >
            Hosting an event?
          </h3>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/organizer')}
              className="pq-btn pq-btn-secondary flex-1"
              style={{ borderRadius: 'var(--radius-xl)' }}
            >
              Create Event
            </button>
            <button
              onClick={() => navigate('/spectator')}
              className="pq-btn pq-btn-ghost flex-1"
              style={{
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--color-border)',
              }}
            >
              Spectator View
            </button>
          </div>
        </div>

        {/* Footer links */}
        <div
          className="w-full flex justify-center gap-4 pb-2 pt-4"
          style={{ borderTop: '1px solid var(--color-border-light)', marginTop: 16 }}
        >
          <a
            href="/privacy"
            style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            Privacy Policy
          </a>
          <a
            href="/terms"
            style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}
          >
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  )
}
