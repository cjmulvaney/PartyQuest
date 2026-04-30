import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme.jsx'

const steps = [
  {
    number: '1',
    heading: 'You set it up in minutes',
    description: 'Name your event, pick the types of missions you want, and get a shareable link or join code for your guests.',
    image: '/screenshots/org-create-event.png',
    alt: 'Creating an event in Party Quest',
    narrow: false,
  },
  {
    number: '2',
    heading: 'Guests join on their phone',
    description: 'No app download needed. They open your link, enter their name, and they\'re in.',
    image: '/screenshots/participant-signup.png',
    alt: 'Guest joining a Party Quest event',
    narrow: true,
  },
  {
    number: '3',
    heading: 'Everyone gets secret missions',
    description: 'Each guest gets their own personal challenges — start conversations, pull off dares, share stories. Only they can see theirs.',
    image: '/screenshots/participant-missions.png',
    alt: 'Guest viewing their secret missions',
    narrow: true,
  },
  {
    number: '4',
    heading: 'Points, leaderboard, bragging rights',
    description: 'Guests earn points as they complete missions. A live leaderboard keeps the energy up all night.',
    image: '/screenshots/participant-leaderboard.png',
    alt: 'Live leaderboard',
    narrow: true,
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
        padding: '52px 24px 44px',
        textAlign: 'center',
        maxWidth: '540px',
        margin: '0 auto',
      }}>
        {/* Logo badge */}
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
            margin: '0 auto 24px',
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
            margin: '0 0 16px',
          }}
        >
          The social game your guests will actually talk about.
        </h1>

        <p
          className="animate-slide-up stagger-2"
          style={{
            fontSize: '1.0625rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.65,
            margin: '0 0 32px',
          }}
        >
          Give everyone at your party secret missions to complete.
          They earn points, you watch it unfold.
        </p>

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

      {/* Divider label */}
      <div style={{
        textAlign: 'center',
        padding: '0 24px 24px',
      }}>
        <span style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-body)',
        }}>
          How it works
        </span>
      </div>

      {/* Steps with screenshots */}
      <section style={{ paddingBottom: '16px' }}>
        {steps.map((step, i) => (
          <div
            key={step.number}
            className="animate-fade-in"
            style={{
              padding: '28px 24px 36px',
              borderTop: '1px solid var(--color-border-light)',
              maxWidth: '540px',
              margin: '0 auto',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {/* Step number + heading */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{
                width: '28px',
                height: '28px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary)',
                color: 'white',
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {step.number}
              </span>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                margin: 0,
                lineHeight: 1.2,
              }}>
                {step.heading}
              </h2>
            </div>

            <p style={{
              fontSize: '0.9375rem',
              color: 'var(--color-text-secondary)',
              lineHeight: 1.6,
              margin: '0 0 20px 40px',
            }}>
              {step.description}
            </p>

            {/* Screenshot */}
            <div style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--color-border-light)',
              maxWidth: step.narrow ? '260px' : '100%',
              margin: step.narrow ? '0 auto' : '0',
            }}>
              <img
                src={step.image}
                alt={step.alt}
                style={{ width: '100%', display: 'block' }}
                loading="lazy"
              />
            </div>
          </div>
        ))}

        {/* Full walkthrough link */}
        <div style={{ textAlign: 'center', padding: '8px 24px 32px', maxWidth: '540px', margin: '0 auto' }}>
          <button
            onClick={() => navigate('/how-it-works')}
            className="pq-btn pq-btn-ghost"
            style={{
              fontSize: '0.9rem',
              color: 'var(--color-primary)',
              border: 'none',
              padding: '8px 16px',
            }}
          >
            See the full walkthrough →
          </button>
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{
        padding: '40px 24px 48px',
        textAlign: 'center',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-light)',
      }}>
        <div style={{ maxWidth: '420px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.625rem',
            fontWeight: 700,
            color: 'var(--color-text)',
            margin: '0 0 8px',
            lineHeight: 1.2,
          }}>
            Ready to host one?
          </h2>
          <p style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
            margin: '0 0 24px',
            lineHeight: 1.5,
          }}>
            Free to use. Takes about 5 minutes to set up.
          </p>
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
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--color-border-light)',
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
      }}>
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
      </footer>

    </div>
  )
}
