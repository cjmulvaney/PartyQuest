import { useNavigate } from 'react-router-dom'

export default function Terms() {
  const navigate = useNavigate()

  return (
    <div
      className="min-h-screen px-4 py-10"
      style={{ background: 'var(--color-bg)', color: 'var(--color-text)' }}
    >
      <div className="max-w-2xl mx-auto" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <button
            onClick={() => navigate('/')}
            className="pq-btn pq-btn-ghost"
            style={{ marginBottom: 16, fontSize: '0.875rem' }}
          >
            ← Back
          </button>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
              fontWeight: 700,
              color: 'var(--color-navy)',
              margin: 0,
            }}
          >
            Terms of Service
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: '0.875rem' }}>
            Last updated: April 28, 2026
          </p>
        </div>

        <div className="pq-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Section title="What Party Quest Is">
            <p>
              Party Quest is an event game platform operated by Connor Mulvaney. Event organizers use
              it to create interactive, mission-based social games for their guests. Party Quest provides
              the platform; each event is hosted by the organizer who created it.
            </p>
          </Section>

          <Section title="Using the Service">
            <p>By using Party Quest, you agree to:</p>
            <ul>
              <li>Provide accurate information when registering for events</li>
              <li>Use the service only for its intended purpose (participating in or hosting events)</li>
              <li>Not attempt to manipulate scores, exploit bugs, or disrupt other participants</li>
            </ul>
            <p>
              Party Quest is intended for users 13 and older. Users under 18 should have parental
              awareness of their participation.
            </p>
          </Section>

          <Section title="SMS Messaging">
            <p>
              If you provide a phone number during event registration, you consent to receive SMS
              messages from Party Quest related to that event. Full details are in our{' '}
              <a href="/privacy" style={{ color: 'var(--color-primary)' }}>Privacy Policy</a>,
              including how to opt out.
            </p>
            <p>Standard messaging and data rates may apply based on your carrier plan.</p>
          </Section>

          <Section title="Event Content">
            <p>
              Mission content is created and curated by Party Quest and event organizers. Party Quest
              is not responsible for how participants interpret or complete missions. Missions are
              intended to be fun and social — participants are responsible for using good judgment and
              respecting others.
            </p>
          </Section>

          <Section title="Limitation of Liability">
            <p>
              Party Quest is provided as-is. We make no guarantees about uptime, data retention, or
              uninterrupted service. To the maximum extent permitted by law, Party Quest and Connor
              Mulvaney are not liable for any damages arising from use of the service.
            </p>
          </Section>

          <Section title="Changes to These Terms">
            <p>
              We may update these terms from time to time. The "Last updated" date reflects the most
              recent revision. Continued use of Party Quest constitutes acceptance.
            </p>
          </Section>

          <Section title="Contact">
            <p>
              <a href="mailto:cjmulvaney@gmail.com" style={{ color: 'var(--color-primary)' }}>
                cjmulvaney@gmail.com
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.1rem',
          fontWeight: 600,
          color: 'var(--color-navy)',
          marginBottom: 10,
        }}
      >
        {title}
      </h2>
      <div
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: '0.9rem',
          lineHeight: 1.7,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {children}
      </div>
    </div>
  )
}
