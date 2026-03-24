import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

export default function ActivityFeed({ eventId, feedMode = 'secret' }) {
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
      .select('id, participant_id, completed_at, photo_url, missions(text)')
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
    return <p className="text-stone-500 text-sm">Loading feed...</p>
  }

  if (entries.length === 0) {
    return <p className="text-stone-400 text-sm text-center py-6">No activity yet.</p>
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-stone-700 text-lg">Activity Feed</h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl bg-white border border-stone-200 p-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-800">
                  <span className="font-semibold">{entry.participantName}</span>
                  {feedMode === 'transparent' ? (
                    <> just completed "<span className="text-emerald-700">{entry.missionText}</span>" and earned 1 point</>
                  ) : (
                    <> just completed a mission and earned 1 point</>
                  )}
                </p>
                <p className="text-stone-400 text-xs mt-1">
                  {new Date(entry.completedAt).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            {entry.photoUrl && (
              <div className="mt-2">
                <img
                  src={entry.photoUrl}
                  alt="Mission photo"
                  className="rounded-lg max-h-40 object-cover"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
