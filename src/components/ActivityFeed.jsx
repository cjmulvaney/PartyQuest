import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'
import { getAvatarColor, getInitials } from '../lib/avatar.js'

const REACTION_EMOJIS = ['\u{1F525}', '\u{1F44F}', '\u{1F60E}', '\u{1F389}', '\u{1F4AA}', '\u{2764}\uFE0F']

function ReactionBar({ entryId, participantId, reactions, onToggleReaction }) {
  const [showPicker, setShowPicker] = useState(false)

  // Group reactions by emoji
  const grouped = {}
  ;(reactions || []).forEach((r) => {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, mine: false }
    grouped[r.emoji].count++
    if (r.participant_id === participantId) grouped[r.emoji].mine = true
  })

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {/* Existing reaction chips */}
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => onToggleReaction(entryId, emoji, data.mine)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            padding: '2px 8px',
            borderRadius: '999px',
            border: data.mine
              ? '1.5px solid var(--color-primary)'
              : '1px solid var(--color-border-light)',
            background: data.mine ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.6,
          }}
        >
          <span>{emoji}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            {data.count}
          </span>
        </button>
      ))}

      {/* Add reaction button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowPicker((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '999px',
            border: '1px solid var(--color-border-light)',
            background: 'var(--color-surface)',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: 'var(--color-text-muted)',
          }}
          title="Add reaction"
        >
          +
        </button>

        {/* Emoji picker popup */}
        {showPicker && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              marginBottom: '4px',
              display: 'flex',
              gap: '2px',
              padding: '4px 6px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-light)',
              boxShadow: 'var(--shadow-md)',
              zIndex: 10,
            }}
          >
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  const mine = grouped[emoji]?.mine
                  onToggleReaction(entryId, emoji, mine)
                  setShowPicker(false)
                }}
                style={{
                  padding: '4px',
                  fontSize: '1.1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  lineHeight: 1,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentSection({ entryId, participantId, comments, participantMap, onAddComment }) {
  const [expanded, setExpanded] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const entryComments = (comments || []).filter((c) => c.participant_mission_id === entryId)
  const commentCount = entryComments.length

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim() || !participantId) return
    setSubmitting(true)
    await onAddComment(entryId, text.trim())
    setText('')
    setSubmitting(false)
  }

  return (
    <div className="mt-2">
      {/* Toggle / count */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {commentCount > 0 ? `${commentCount} comment${commentCount !== 1 ? 's' : ''}` : 'Comment'}
        {expanded ? ' \u25B4' : ' \u25BE'}
      </button>

      {expanded && (
        <div
          className="mt-1.5"
          style={{
            borderLeft: '2px solid var(--color-border-light)',
            paddingLeft: '10px',
          }}
        >
          {/* Existing comments */}
          {entryComments.map((c) => (
            <div key={c.id} className="mb-1.5">
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}
              >
                {participantMap[c.participant_id] || 'Unknown'}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  marginLeft: '6px',
                }}
              >
                {c.text}
              </span>
            </div>
          ))}

          {/* Add comment form */}
          {participantId && (
            <form onSubmit={handleSubmit} className="flex gap-1.5 mt-1">
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment..."
                maxLength={200}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.75rem',
                  padding: '4px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-light)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: text.trim() ? 'var(--color-primary)' : 'var(--color-border)',
                  color: 'var(--color-text-inverse)',
                  cursor: text.trim() ? 'pointer' : 'default',
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                Post
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}

function TimelineEntry({
  entry,
  feedMode,
  showPhotos,
  showComments,
  showReactions,
  showInteractiveComments,
  participantId,
  reactions,
  comments,
  participantMap,
  onToggleReaction,
  onAddComment,
  isFirst,
  isLast,
  index,
}) {
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

        {/* Emoji reactions */}
        {showReactions && (
          <ReactionBar
            entryId={entry.id}
            participantId={participantId}
            reactions={(reactions || []).filter((r) => r.participant_mission_id === entry.id)}
            onToggleReaction={onToggleReaction}
          />
        )}

        {/* Interactive comments */}
        {showInteractiveComments && (
          <CommentSection
            entryId={entry.id}
            participantId={participantId}
            comments={comments}
            participantMap={participantMap}
            onAddComment={onAddComment}
          />
        )}
      </div>
    </div>
  )
}

export default function ActivityFeed({
  eventId,
  feedMode = 'secret',
  showPhotos = true,
  showComments = true,
  showReactions = false,
  showInteractiveComments = false,
  participantId = null,
}) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [reactions, setReactions] = useState([])
  const [comments, setComments] = useState([])
  const [participantMap, setParticipantMap] = useState({})
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
    setParticipantMap(pMap)
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

      // Load reactions and comments for these entries
      const pmIds = feedEntries.map((e) => e.id)
      if (pmIds.length > 0) {
        if (showReactions) {
          const { data: rxns } = await supabase
            .from('completion_reactions')
            .select('id, participant_mission_id, participant_id, emoji')
            .in('participant_mission_id', pmIds)
          setReactions(rxns || [])
        }
        if (showInteractiveComments) {
          const { data: cmts } = await supabase
            .from('completion_comments')
            .select('id, participant_mission_id, participant_id, text, created_at')
            .in('participant_mission_id', pmIds)
            .order('created_at', { ascending: true })
          setComments(cmts || [])
        }
      }
    }

    setLoading(false)
  }, [eventId, showReactions, showInteractiveComments])

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

    // Listen for reaction changes
    if (showReactions) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'completion_reactions' },
        () => loadFeed()
      )
    }

    // Listen for new comments
    if (showInteractiveComments) {
      channel.on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'completion_comments' },
        () => loadFeed()
      )
    }

    channel.subscribe()
    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [eventId, loadFeed, showReactions, showInteractiveComments])

  // Toggle an emoji reaction
  const handleToggleReaction = useCallback(
    async (participantMissionId, emoji, alreadyReacted) => {
      if (!participantId) return
      if (alreadyReacted) {
        // Optimistic remove
        setReactions((prev) =>
          prev.filter(
            (r) =>
              !(r.participant_mission_id === participantMissionId && r.participant_id === participantId && r.emoji === emoji)
          )
        )
        await supabase
          .from('completion_reactions')
          .delete()
          .eq('participant_mission_id', participantMissionId)
          .eq('participant_id', participantId)
          .eq('emoji', emoji)
      } else {
        // Optimistic add with temp id
        const tempReaction = { id: `temp-${Date.now()}`, participant_mission_id: participantMissionId, participant_id: participantId, emoji }
        setReactions((prev) => [...prev, tempReaction])
        await supabase
          .from('completion_reactions')
          .insert({ participant_mission_id: participantMissionId, participant_id: participantId, emoji })
      }
      // Reload to sync with DB
      loadFeed()
    },
    [participantId, loadFeed]
  )

  // Add a comment
  const handleAddComment = useCallback(
    async (participantMissionId, text) => {
      if (!participantId) return
      const { data } = await supabase
        .from('completion_comments')
        .insert({ participant_mission_id: participantMissionId, participant_id: participantId, text })
        .select()
        .single()
      if (data) {
        setComments((prev) => [...prev, data])
      }
    },
    [participantId]
  )

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
            showReactions={showReactions}
            showInteractiveComments={showInteractiveComments}
            participantId={participantId}
            reactions={reactions}
            comments={comments}
            participantMap={participantMap}
            onToggleReaction={handleToggleReaction}
            onAddComment={handleAddComment}
            isFirst={i === 0}
            isLast={i === entries.length - 1}
            index={i}
          />
        ))}
      </div>
    </div>
  )
}
