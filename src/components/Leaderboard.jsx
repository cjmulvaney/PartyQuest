import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { getAvatarColor, getInitials } from '../lib/avatar.js'

const MEDAL_COLORS = [
  'var(--color-gold)',
  'var(--color-silver)',
  'var(--color-bronze)',
]

const MEDAL_LABELS = ['1st', '2nd', '3rd']

// Podium order: 2nd (left), 1st (center), 3rd (right)
const PODIUM_ORDER = [1, 0, 2]
const PODIUM_HEIGHTS = ['70%', '100%', '55%']

function PodiumPlayer({ entry, rank, anonymity, fullscreen }) {
  if (!entry) return <div className="flex-1" />

  const displayName = anonymity ? `Player ${rank + 1}` : entry.name
  const avatarColor = getAvatarColor(entry.name)
  const initials = getInitials(entry.name)
  const avatarSize = rank === 0 ? 'pq-avatar pq-avatar-lg' : 'pq-avatar pq-avatar-md'
  const medalColor = MEDAL_COLORS[rank]

  return (
    <div className="flex flex-col items-center flex-1">
      {/* Avatar + Medal */}
      <div className="relative mb-2">
        <div
          className={avatarSize}
          style={{
            backgroundColor: avatarColor,
            color: 'var(--color-text-inverse)',
            fontFamily: 'var(--font-heading)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            border: `3px solid ${medalColor}`,
            boxShadow: rank === 0 ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
          }}
        >
          {initials}
        </div>
        {/* Medal badge */}
        <span
          className="pq-badge"
          style={{
            position: 'absolute',
            bottom: '-6px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: medalColor,
            color: rank === 0 ? 'var(--color-navy)' : 'var(--color-text-inverse)',
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '0.7rem',
            minWidth: '28px',
            textAlign: 'center',
          }}
        >
          {MEDAL_LABELS[rank]}
        </span>
      </div>

      {/* Name */}
      <p
        className="mt-3 text-center truncate w-full px-1"
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: rank === 0 ? 700 : 600,
          fontSize: fullscreen
            ? rank === 0 ? '1.1rem' : '0.95rem'
            : rank === 0 ? '0.95rem' : '0.85rem',
          color: 'var(--color-text)',
        }}
      >
        {displayName}
      </p>

      {/* Points */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 600,
          fontSize: fullscreen ? '0.9rem' : '0.8rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        {entry.points} {entry.points === 1 ? 'pt' : 'pts'}
      </p>

      {/* Podium bar */}
      <div
        className={`podium-bar podium-bar-${rank + 1}`}
        style={{
          width: '100%',
          marginTop: '0.5rem',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
          background: rank === 0
            ? 'linear-gradient(to top, var(--color-accent), var(--color-accent-light))'
            : rank === 1
              ? 'linear-gradient(to top, var(--color-secondary), var(--color-secondary-light))'
              : 'linear-gradient(to top, var(--color-primary), var(--color-primary-light))',
        }}
      />
    </div>
  )
}

function RankedEntry({ entry, rank, index, anonymity, fullscreen }) {
  const displayName = anonymity ? `Player ${rank}` : entry.name
  const avatarColor = getAvatarColor(entry.name)
  const initials = getInitials(entry.name)

  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border-light)',
        borderRadius: index === 0 ? 'var(--radius-md) var(--radius-md) 0 0' : undefined,
        animation: `slideInUp 0.3s ease-out ${index * 0.06}s both`,
        transition: 'var(--transition-fast)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--color-surface)'
      }}
    >
      {/* Rank number */}
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: fullscreen ? '1rem' : '0.9rem',
          color: 'var(--color-text-muted)',
          width: '28px',
          textAlign: 'center',
        }}
      >
        {rank}
      </span>

      {/* Avatar */}
      <div
        className="pq-avatar pq-avatar-sm"
        style={{
          backgroundColor: avatarColor,
          color: 'var(--color-text-inverse)',
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.7rem',
        }}
      >
        {initials}
      </div>

      {/* Name */}
      <span
        className="flex-1 truncate"
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          fontSize: fullscreen ? '1rem' : '0.9rem',
          color: 'var(--color-text)',
        }}
      >
        {displayName}
      </span>

      {/* Points */}
      <span
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 600,
          fontSize: fullscreen ? '0.95rem' : '0.85rem',
          color: 'var(--color-text-secondary)',
        }}
      >
        {entry.points} {entry.points === 1 ? 'pt' : 'pts'}
      </span>
    </div>
  )
}

export default function Leaderboard({ eventId, anonymity = false, fullscreen = false }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const loadScores = useCallback(async () => {
    // Get all participants for this event
    const { data: participants } = await supabase
      .from('participants')
      .select('id, name')
      .eq('event_id', eventId)

    if (!participants || participants.length === 0) {
      setScores([])
      setLoading(false)
      return
    }

    // Get completed missions count per participant
    const { data: completions } = await supabase
      .from('participant_missions')
      .select('participant_id')
      .eq('completed', true)
      .in('participant_id', participants.map((p) => p.id))

    // Count completions per participant
    const counts = {}
    participants.forEach((p) => (counts[p.id] = 0))
    completions?.forEach((c) => {
      if (counts[c.participant_id] !== undefined) {
        counts[c.participant_id]++
      }
    })

    // Build sorted leaderboard
    const board = participants
      .map((p, i) => ({
        id: p.id,
        name: p.name,
        displayName: anonymity ? `Player ${i + 1}` : p.name,
        points: counts[p.id] || 0,
      }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)

    setScores(board)
    setLoading(false)
  }, [eventId, anonymity])

  useEffect(() => {
    loadScores()
  }, [loadScores])

  // Supabase Realtime -- listen for mission completion changes
  useEffect(() => {
    const channel = supabase
      .channel(`leaderboard-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participant_missions',
        },
        (payload) => {
          if (payload.new?.completed !== payload.old?.completed) {
            loadScores()
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'participant_missions',
        },
        () => {
          loadScores()
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [eventId, loadScores])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="pq-spinner" />
      </div>
    )
  }

  const topThree = scores.slice(0, 3)
  const rest = scores.slice(3)

  return (
    <div>
      {/* Keyframe animation for staggered list entrance */}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Header */}
      <h2
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: fullscreen ? '1.5rem' : '1.15rem',
          color: 'var(--color-text)',
          marginBottom: '1rem',
        }}
      >
        Leaderboard
      </h2>

      {scores.length === 0 && (
        <p
          className="text-center py-6"
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
          }}
        >
          No participants yet.
        </p>
      )}

      {/* Podium for top 3 */}
      {topThree.length > 0 && (
        <div
          className="pq-card"
          style={{
            padding: fullscreen ? '1.5rem 1rem 0' : '1rem 0.75rem 0',
            marginBottom: '0.75rem',
            overflow: 'hidden',
          }}
        >
          <div
            className="flex items-end justify-center gap-2"
            style={{ minHeight: fullscreen ? '220px' : '180px' }}
          >
            {PODIUM_ORDER.map((podiumIdx) => {
              const entry = topThree[podiumIdx]
              return (
                <PodiumPlayer
                  key={entry?.id ?? `empty-${podiumIdx}`}
                  entry={entry}
                  rank={podiumIdx}
                  anonymity={anonymity}
                  fullscreen={fullscreen}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Ranked list for positions 4-10 */}
      {rest.length > 0 && (
        <div
          className="pq-card"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          {rest.map((entry, i) => (
            <RankedEntry
              key={entry.id}
              entry={entry}
              rank={i + 4}
              index={i}
              anonymity={anonymity}
              fullscreen={fullscreen}
            />
          ))}
        </div>
      )}
    </div>
  )
}
