import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { getAvatarColor, getInitials } from '../lib/avatar.js'

function TimelineEntry({ entry, feedMode, showPhotos, showComments, isFirst, isLast, index }) {
  const avatarColor = getAvatarColor(entry.participantName)
  const initials = getInitials(entry.participantName)

  const timeString = new Date(entry.completedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div
      className="flex gap-3"
      style={{
        animation: `feedSlideIn 0.35s ease-out ${index * 0.07}s both`,
      }}
    >
      {/* Timeline connector column */}
      <div className="flex flex-col items-center" style={{ width: '40px', flexShrink: 0 }}>
        {/* Top connector line */}
        {!isFirst && (
          <div
            style={{
              width: '2px',
              height: '12px',
              backgroundColor: 'var(--color-border)',
            }}
          />
        )}
        {isFirst && <div style={{ height: '12px' }} />}

        {/* Avatar node */}
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
            fontSize: '0.65rem',
            flexShrink: 0,
            border: '2px solid var(--color-surface)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {initials}
        </div>

        {/* Bottom connector line */}
        {!isLast && (
          <div
            style={{
              width: '2px',
              flex: 1,
              backgroundColor: 'var(--color-border)',
            }}
          />
        )}
      </div>

      {/* Entry content */}
      <div
        className="flex-1 pb-4"
        style={{ minWidth: 0, paddingTop: '8px' }}
      >
        {/* Name and timestamp */}
        <div className="flex items-baseline gap-2 mb-1">
          <span
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              fontSize: '0.9rem',
              color: 'var(--color-text)',
            }}
          >
            {entry.participantName}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}
          >
            {timeString}
          </span>
        </div>

        {/* Action text */}
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.85rem',
            color: 'var(--color-text-secondary)',
            lineHeight: 1.5,
          }}
        >
          {feedMode === 'transparent' ? (
            <>
              Completed{' '}
              <span
                style={{
                  color: 'var(--color-primary)',
                  fontWeight: 600,
                }}
              >
                "{entry.missionText}"
              </span>
              {' '}and earned 1 point
            </>
          ) : (
            <>Completed a mission and earned 1 point</>
          )}
        </p>

        {/* Comment/notes */}
        {showComments && entry.notes && (
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              fontStyle: 'italic',
              lineHeight: 1.4,
            }}
          >
            "{entry.notes}"
          </p>
        )}

        {/* Photo */}
        {showPhotos && entry.photoUrl && (
          <div
            className="mt-2"
            style={{
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              border: '1px solid var(--color-border-light)',
              maxWidth: '280px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <img
              src={entry.photoUrl}
              alt="Mission completion"
              style={{
                display: 'block',
                width: '100%',
                aspectRatio: '4 / 3',
                objectFit: 'cover',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function ActivityFeed({ eventId, feedMode = 'secret', showPhotos = true, showComments = true }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)

  const loadFeed = useCallback(async () => {
    // Get all participants for this event
    const { data: participants } = await supabase
      .from('participants')
      .select('id, name')
      .eq('event_id', eventId)

    if (!participants || participants.length === 0) {
      setEntries([])
      setLoading(false)
      return
    }

    const pMap = {}
    participants.forEach((p) => (pMap[p.id] = p.name))
    const pIds = participants.map((p) => p.id)

    // Get completed missions
    const { data: completions } = await supabase
      .from('participant_missions')
      .select('id, participant_id, completed_at, photo_url, notes, missions(text)')
      .eq('completed', true)
      .in('participant_id', pIds)
      .order('completed_at', { ascending: false })
      .limit(50)

    if (completions) {
      const feedEntries = completions
        .filter((c) => c.completed_at)
        .map((c) => ({
          id: c.id,
          participantName: pMap[c.participant_id] || 'Unknown',
          missionText: c.missions?.text || '',
          completedAt: c.completed_at,
          photoUrl: c.photo_url,
          notes: c.notes,
        }))
      setEntries(feedEntries)
    }

    setLoading(false)
  }, [eventId])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`feed-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'participant_missions',
        },
        (payload) => {
          if (payload.new?.completed && !payload.old?.completed) {
            loadFeed()
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [eventId, loadFeed])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="pq-spinner" />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p
          style={{
            fontFamily: 'var(--font-body)',
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
          }}
        >
          No activity yet. Completions will appear here in real time.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Keyframe animation for new entries */}
      <style>{`
        @keyframes feedSlideIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* Header */}
      <h3
        style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '1.15rem',
          color: 'var(--color-text)',
          marginBottom: '0.75rem',
        }}
      >
        Activity Feed
      </h3>

      {/* Timeline */}
      <div
        className="pq-card"
        style={{ padding: '0.75rem 0.75rem 0.25rem' }}
      >
        {entries.map((entry, i) => (
          <TimelineEntry
            key={entry.id}
            entry={entry}
            feedMode={feedMode}
            showPhotos={showPhotos}
            showComments={showComments}
            isFirst={i === 0}
            isLast={i === entries.length - 1}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}
