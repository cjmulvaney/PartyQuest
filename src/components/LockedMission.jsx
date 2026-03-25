export default function LockedMission({ unlockTime }) {
  const time = new Date(unlockTime)
  const label = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <div
      className="pq-card w-full"
      style={{
        background: 'var(--color-surface-hover)',
        borderColor: 'var(--color-border)',
        borderStyle: 'dashed',
        borderWidth: '1.5px',
        opacity: 0.7,
        minHeight: 72,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Lock icon */}
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-border)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <rect
              x="3"
              y="7"
              width="10"
              height="8"
              rx="2"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M5 7V5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5V7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle cx="8" cy="11" r="1" fill="currentColor" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-body)',
              lineHeight: 1.4,
            }}
          >
            Unlocks at {label}
          </p>
        </div>

        {/* Clock icon */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          className="flex-shrink-0"
          style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}
        >
          <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path
            d="M9 5V9L11.5 10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}
