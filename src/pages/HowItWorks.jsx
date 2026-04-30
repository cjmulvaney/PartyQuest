import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme.jsx'

const hostSteps = [
  {
    number: '1',
    heading: 'Create your event',
    description: 'Give it a name, pick an event type, and set the start and end time. The start time controls when missions go live for guests.',
    image: '/screenshots/org-create-event.png',
    alt: 'Event creation form',
    narrow: false,
  },
  {
    number: '2',
    heading: 'Choose your mission categories',
    description: 'Pick from categories like Icebreakers, Silly Dares, Deep Cut, Food & Drink, and more. You can preview missions before locking in your selections.',
    image: '/screenshots/org-select-missions.png',
    alt: 'Mission category selection',
    narrow: false,
  },
  {
    number: '3',
    heading: 'Share the invite link',
    description: 'Once created, you get a shareable link and a join code. Send the link to guests directly, or display the code at your event.',
    image: '/screenshots/org-manage-event.png',
    alt: 'Event management view with invite link and participant list',
    narrow: false,
  },
  {
    number: '4',
    heading: 'Watch it unfold',
    description: 'Track who has joined, see mission completion progress, and watch the leaderboard update in real time from your dashboard.',
    image: '/screenshots/org-preview-missions.png',
    alt: 'Preview of participant mission assignments',
    narrow: false,
  },
]

const guestSteps = [
  {
    number: '1',
    heading: 'Join with the link or code',
    description: 'Guests open the invite link or go to the site and enter the join code. They add their name — no account needed.',
    image: '/screenshots/participant-signup.png',
    alt: 'Guest sign up screen',
    narrow: true,
  },
  {
    number: '2',
    heading: 'Get secret missions',
    description: 'Each guest gets their own unique set of challenges — things to say, ask, do, or find out. Nobody else can see their list.',
    image: '/screenshots/participant-missions.png',
    alt: 'Guest mission list',
    narrow: true,
  },
  {
    number: '3',
    heading: 'Earn points on the leaderboard',
    description: 'Completing a mission earns points. The live leaderboard updates as people check things off — everyone can see it.',
    image: '/screenshots/participant-leaderboard.png',
    alt: 'Live leaderboard',
    narrow: true,
  },
  {
    number: '4',
    heading: 'See the activity feed',
    description: 'Every completion shows up in the feed — who did what, when. Keeps the energy going even if you\'re across the room.',
    image: '/screenshots/participant-feed.png',
    alt: 'Activity feed',
    narrow: true,
  },
]

function Step({ step }) {
  return (
    <div style={{
      padding: '28px 0 36px',
      borderTop: '1px solid var(--color-border-light)',
    }}>
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
        <h3 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--color-text)',
          margin: 0,
          lineHeight: 1.2,
        }}>
          {step.heading}
        </h3>
      </div>

      <p style={{
        fontSize: '0.9375rem',
        color: 'var(--color-text-secondary)',
        lineHeight: 1.65,
        margin: '0 0 20px 40px',
      }}>
        {step.description}
      </p>

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
  )
}

export default function HowItWorks() {
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
        <button
          onClick={() => navigate('/')}
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Party Quest
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/join')}
            className="pq-btn pq-btn-ghost"
            style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}
          >
            Join Event
          </button>
          <button
            className="theme-toggle"
            data-active={theme === 'dark'}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          />
        </div>
      </header>

      {/* Page header */}
      <section style={{
        padding: '48px 24px 32px',
        maxWidth: '540px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(1.75rem, 7vw, 2.5rem)',
          fontWeight: 700,
          color: 'var(--color-text)',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
          margin: '0 0 12px',
        }}>
          How Party Quest works
        </h1>
        <p style={{
          fontSize: '1rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.65,
          margin: 0,
        }}>
          A 5-minute setup for the host. A fun, no-download experience for every guest.
        </p>
      </section>

      {/* Host section */}
      <section style={{ maxWidth: '540px', margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-primary-light)',
          border: '1px solid var(--color-primary-subtle)',
          borderRadius: 'var(--radius-full)',
          padding: '6px 14px',
          marginBottom: '8px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-body)',
          }}>
            For the host
          </span>
        </div>

        {hostSteps.map((step) => (
          <Step key={step.number} step={step} />
        ))}
      </section>

      {/* Guest section */}
      <section style={{ maxWidth: '540px', margin: '32px auto 0', padding: '0 24px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-secondary-light)',
          border: '1px solid var(--color-secondary)',
          borderRadius: 'var(--radius-full)',
          padding: '6px 14px',
          marginBottom: '8px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-secondary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-secondary)',
            fontFamily: 'var(--font-body)',
          }}>
            For guests
          </span>
        </div>

        {guestSteps.map((step) => (
          <Step key={step.number} step={step} />
        ))}
      </section>

      {/* Bottom CTA */}
      <section style={{
        padding: '48px 24px 56px',
        textAlign: 'center',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-light)',
        marginTop: '40px',
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
            Ready to try it?
          </h2>
          <p style={{
            fontSize: '0.9375rem',
            color: 'var(--color-text-secondary)',
            margin: '0 0 24px',
            lineHeight: 1.5,
          }}>
            Free to use. Takes about 5 minutes to set up.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
