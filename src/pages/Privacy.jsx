import { useNavigate } from 'react-router-dom'

export default function Privacy() {
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
            Privacy Policy
          </h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 6, fontSize: '0.875rem' }}>
            Last updated: April 28, 2026
          </p>
        </div>

        <div className="pq-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Section title="About Party Quest">
            <p>
              Party Quest is an event game platform operated by Connor Mulvaney. It lets event organizers
              create interactive mission-based games for their guests. Party Quest is the sender of all
              SMS messages sent through this service.
            </p>
            <p>
              Questions or concerns: <a href="mailto:cjmulvaney@gmail.com" style={{ color: 'var(--color-primary)' }}>cjmulvaney@gmail.com</a>
            </p>
          </Section>

          <Section title="Information We Collect">
            <p>When you register for a Party Quest event, we may collect:</p>
            <ul>
              <li>Your name (as you provide it)</li>
              <li>Your phone number (only if you choose to enter it)</li>
              <li>Your event participation data (missions completed, points earned)</li>
            </ul>
            <p>Phone numbers are optional. If you don't provide one, all other features work normally.</p>
          </Section>

          <Section title="SMS Messaging Program">
            <p>
              <strong>Program name:</strong> Party Quest<br />
              <strong>Sender:</strong> Party Quest (operated by Connor Mulvaney)
            </p>
            <p>
              By entering your phone number on the Party Quest event registration page, you consent to
              receive SMS text messages from Party Quest. Message types include:
            </p>
            <ul>
              <li>Your event access code upon registration</li>
              <li>Notifications when your event goes live</li>
              <li>Event reminders (approximately 15 minutes before start)</li>
              <li>A post-event feedback request</li>
            </ul>
            <p>
              <strong>Message frequency:</strong> Varies based on event activity, typically 2–4 messages
              per event you join.
            </p>
            <p>
              <strong>To stop receiving messages:</strong> Reply <strong>STOP</strong> to any message.
              You will receive one confirmation and no further messages will be sent.
            </p>
            <p>
              <strong>For help:</strong> Reply <strong>HELP</strong> or email{' '}
              <a href="mailto:cjmulvaney@gmail.com" style={{ color: 'var(--color-primary)' }}>
                cjmulvaney@gmail.com
              </a>
            </p>
            <p>
              <strong>Msg &amp; data rates may apply.</strong> Carrier is not liable for delayed or
              undelivered messages.
            </p>
          </Section>

          <Section title="How We Use Your Information">
            <p>We use your information only to operate the Party Quest service:</p>
            <ul>
              <li>Sending you the SMS messages described above</li>
              <li>Running the event game (mission assignments, scoring)</li>
              <li>Improving the service based on aggregate, anonymized usage data</li>
            </ul>
            <p>
              We do not sell your phone number or personal information. We do not share it with third
              parties except Twilio, Inc., which provides SMS delivery infrastructure on our behalf.
              Twilio's privacy policy is available at{' '}
              <a href="https://www.twilio.com/en-us/legal/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                twilio.com/en-us/legal/privacy
              </a>.
            </p>
          </Section>

          <Section title="Data Retention">
            <p>
              Phone numbers are stored in our database only as long as your participant record is active.
              Event data is retained for operational purposes. You can request deletion by emailing{' '}
              <a href="mailto:cjmulvaney@gmail.com" style={{ color: 'var(--color-primary)' }}>
                cjmulvaney@gmail.com
              </a>.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p>
              We may update this policy from time to time. The "Last updated" date at the top of this
              page reflects the most recent revision. Continued use of Party Quest after changes
              constitutes acceptance of the updated policy.
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
