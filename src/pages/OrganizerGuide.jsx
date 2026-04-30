import { useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme.jsx'

const bodyText = {
  fontSize: '0.9375rem',
  color: 'var(--color-text-secondary)',
  lineHeight: 1.65,
  margin: '0 0 14px',
}

const sections = [
  {
    id: 'what',
    label: 'What is Party Quest',
    color: 'var(--color-primary)',
    colorLight: 'var(--color-primary-light)',
    colorSubtle: 'var(--color-primary-subtle)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    heading: 'What is Party Quest?',
    body: (
      <>
        <p style={bodyText}>
          Party Quest is an app for distributing secret missions to people at a party. Guests show up, get their own personal list of challenges, and try to complete them without anyone else knowing what's on their list.
        </p>
        <p style={bodyText}>
          Missions are designed to get people talking, laughing, and interacting with people they might not otherwise approach. Think: "Find out someone's most embarrassing childhood nickname" or "Get two strangers to do a toast together." Low-stakes, high-reward social catalysts.
        </p>
        <p style={bodyText}>
          As host, you set it up in about 5 minutes. After that, the app runs itself — you can watch the leaderboard fill up and the activity feed scroll while you actually enjoy your own party.
        </p>
      </>
    ),
  },
  {
    id: 'flow',
    label: 'How it works',
    color: 'var(--color-secondary)',
    colorLight: 'var(--color-secondary-light)',
    colorSubtle: 'var(--color-secondary)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    heading: 'How a Party Quest works',
    flowSteps: [
      { who: 'You', step: 'Create an event — give it a name, pick a mission category set, set the start and end time.' },
      { who: 'You', step: 'Share the invite link or join code with guests before or at the event.' },
      { who: 'Guests', step: 'Open the link, enter their name — no account, no app download required.' },
      { who: 'Guests', step: 'When the event starts, they each receive their own secret mission list.' },
      { who: 'Guests', step: "Complete missions, check them off, earn points. Nobody can see anyone else's missions." },
      { who: 'Everyone', step: 'Watch the activity feed — every completion shows up in real time. The leaderboard updates live.' },
      { who: 'You', step: "From your dashboard, track participation, send SMS blasts, release new mission batches, and see who's winning." },
    ],
  },
  {
    id: 'dashboard',
    label: 'The dashboard',
    color: 'var(--color-primary)',
    colorLight: 'var(--color-primary-light)',
    colorSubtle: 'var(--color-primary-subtle)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    heading: 'Your organizer dashboard',
    dashboardItems: [
      { label: 'Participant list', desc: 'See who has joined. Names appear as guests register.' },
      { label: 'Mission release', desc: 'Missions unlock in batches — you control the pacing. Release a new batch when energy needs a boost.' },
      { label: 'SMS blast', desc: 'Send a custom text to all participants at once. Useful for countdowns, nudges, or announcements.' },
      { label: 'Leaderboard & feed', desc: 'Live updates as guests complete missions. You can watch it alongside your guests — or leave it on a screen at the party.' },
      { label: 'Event controls', desc: 'Edit event details, end early, or extend the time from this view.' },
    ],
  },
  {
    id: 'why',
    label: 'Why it works',
    color: 'var(--color-secondary)',
    colorLight: 'var(--color-secondary-light)',
    colorSubtle: 'var(--color-secondary)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    heading: 'Why it works',
    body: (
      <>
        <p style={bodyText}>
          Parties are awkward. People cluster with who they already know, conversations stay surface-level, and half the room spends 20 minutes deciding what to put on a shared playlist.
        </p>
        <p style={bodyText}>
          Party Quest gives people a reason to approach strangers — and a built-in excuse. "I have to ask you something weird" is a lot easier when there's a game behind it. The mission is the social permission slip.
        </p>
        <p style={bodyText}>
          The secret element matters too. Nobody knows what's on anyone else's list, which means every interaction has a little mystery. Someone might be completing a mission on you right now, or they might just be being friendly. That ambiguity is most of the fun.
        </p>
        <p style={bodyText}>
          The missions themselves are designed to hit a specific register: silly enough to be low-stakes, specific enough to actually require talking to people, and occasionally genuine enough to create real connection. The humor and silliness are load-bearing — they make it safe to play.
        </p>
      </>
    ),
  },
  {
    id: 'tips',
    label: 'Tips for a good event',
    color: 'var(--color-primary)',
    colorLight: 'var(--color-primary-light)',
    colorSubtle: 'var(--color-primary-subtle)',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    heading: 'Tips for a good event',
    tips: [
      'Works best with 8–30 people. Too small and it gets cliquey fast; too large and the feed moves too quickly to follow.',
      "Announce it when people arrive so they know the game is running. You don't need to explain everything — just that everyone has secret missions and should check their phones.",
      'Put the leaderboard up on a shared screen if you can. Social pressure is part of the fuel.',
      'Use the SMS blast for a mid-event nudge if things slow down. Something like "New missions dropping in 5 minutes" goes a long way.',
      "Don't over-moderate. The app is designed to run without you — trust it.",
    ],
  },
]

function SectionLabel({ section }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      background: section.colorLight,
      border: `1px solid ${section.colorSubtle}`,
      borderRadius: 'var(--radius-full)',
      padding: '6px 14px',
      marginBottom: '16px',
      color: section.color,
    }}>
      {section.icon}
      <span style={{
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-body)',
      }}>
        {section.label}
      </span>
    </div>
  )
}

export default function OrganizerGuide() {
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
          Organizer guide
        </h1>
        <p style={{
          fontSize: '1rem',
          color: 'var(--color-text-secondary)',
          lineHeight: 1.65,
          margin: 0,
        }}>
          Everything you need to know to run a great Party Quest — what it is, how it works, and how to get the most out of it.
        </p>
      </section>

      {/* Quick nav */}
      <nav style={{ maxWidth: '540px', margin: '0 auto', padding: '0 24px 40px' }}>
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <p style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-body)',
            margin: '0 0 4px',
          }}>
            On this page
          </p>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-text-secondary)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 0',
                transition: 'color var(--transition-fast)',
              }}
              onMouseEnter={e => e.currentTarget.style.color = s.color}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
            >
              <span style={{ color: s.color, display: 'flex' }}>{s.icon}</span>
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Content sections */}
      <div style={{ maxWidth: '540px', margin: '0 auto', padding: '0 24px' }}>

        {/* What is Party Quest */}
        <section id="what" style={{ paddingBottom: '48px' }}>
          <SectionLabel section={sections[0]} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px', lineHeight: 1.2 }}>
            {sections[0].heading}
          </h2>
          {sections[0].body}
        </section>

        {/* How it works */}
        <section id="flow" style={{ paddingTop: '48px', paddingBottom: '48px', borderTop: '1px solid var(--color-border-light)' }}>
          <SectionLabel section={sections[1]} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px', lineHeight: 1.2 }}>
            {sections[1].heading}
          </h2>
          <p style={bodyText}>Here's the full flow from your perspective and your guests':</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sections[1].flowSteps.map((item, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '14px',
                padding: '16px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--color-border-light)',
              }}>
                <div style={{ paddingTop: '2px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: 'var(--radius-full)',
                    background: item.who === 'You' ? 'var(--color-primary)' : item.who === 'Everyone' ? 'var(--color-accent)' : 'var(--color-secondary)',
                    color: item.who === 'Everyone' ? 'var(--color-text)' : 'white',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </div>
                </div>
                <div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    color: item.who === 'You' ? 'var(--color-primary)' : item.who === 'Everyone' ? 'var(--color-warning)' : 'var(--color-secondary)',
                    display: 'block',
                    marginBottom: '3px',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {item.who}
                  </span>
                  <p style={{ ...bodyText, margin: 0 }}>{item.step}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Dashboard */}
        <section id="dashboard" style={{ paddingTop: '48px', paddingBottom: '48px', borderTop: '1px solid var(--color-border-light)' }}>
          <SectionLabel section={sections[2]} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px', lineHeight: 1.2 }}>
            {sections[2].heading}
          </h2>
          <p style={bodyText}>
            Once your event is live, the dashboard is your control room. It walks you through everything — but here's a quick orientation:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
            {sections[2].dashboardItems.map((item, i) => (
              <div key={i} style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
              }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--color-text)', marginBottom: '4px' }}>
                  {item.label}
                </div>
                <p style={{ ...bodyText, margin: 0, fontSize: '0.875rem' }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <p style={{ ...bodyText, fontSize: '0.875rem', color: 'var(--color-text-muted)', margin: 0 }}>
            The dashboard is designed to be self-explanatory — if something isn't clear, there's usually a tooltip or inline description to help.
          </p>
        </section>

        {/* Why it works */}
        <section id="why" style={{ paddingTop: '48px', paddingBottom: '48px', borderTop: '1px solid var(--color-border-light)' }}>
          <SectionLabel section={sections[3]} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 16px', lineHeight: 1.2 }}>
            {sections[3].heading}
          </h2>
          {sections[3].body}
        </section>

        {/* Tips */}
        <section id="tips" style={{ paddingTop: '48px', paddingBottom: '48px', borderTop: '1px solid var(--color-border-light)' }}>
          <SectionLabel section={sections[4]} />
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 20px', lineHeight: 1.2 }}>
            {sections[4].heading}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sections[4].tips.map((tip, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  marginTop: '8px',
                  flexShrink: 0,
                }} />
                <p style={{ ...bodyText, margin: 0 }}>{tip}</p>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Bottom CTA */}
      <section style={{
        padding: '48px 24px 56px',
        textAlign: 'center',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border-light)',
        marginTop: '8px',
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
            Ready to host?
          </h2>
          <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-secondary)', margin: '0 0 24px', lineHeight: 1.5 }}>
            Takes about 5 minutes to set up. Free to use.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => navigate('/organizer')}
              className="pq-btn pq-btn-primary"
              style={{ width: '100%', fontSize: '1.0625rem', padding: '15px 24px', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-glow)' }}
            >
              Create an Event
            </button>
            <button
              onClick={() => navigate('/how-it-works')}
              className="pq-btn pq-btn-ghost"
              style={{ width: '100%', fontSize: '0.9375rem', padding: '13px 24px', borderRadius: 'var(--radius-xl)', border: '1.5px solid var(--color-border)' }}
            >
              See How It Works
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
        <a href="/privacy" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
        <a href="/terms" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>Terms of Service</a>
      </footer>

    </div>
  )
}
