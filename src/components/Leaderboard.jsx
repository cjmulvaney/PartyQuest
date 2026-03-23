import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

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
        name: anonymity ? `Player ${i + 1}` : p.name,
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

  // Supabase Realtime — listen for mission completion changes
  useEffect(() => {
    // Subscribe to participant_missions changes for this event's participants
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
          // Reload scores when any mission completion changes
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
    return <p className="text-stone-500 text-sm">Loading leaderboard...</p>
  }

  const titleClass = fullscreen
    ? 'text-2xl font-bold text-stone-700 mb-2'
    : 'text-lg font-semibold text-stone-700'

  const entryClass = fullscreen
    ? 'flex items-center gap-4 rounded-xl px-5 py-4'
    : 'flex items-center gap-3 rounded-xl px-4 py-3'

  return (
    <div className="space-y-3">
      <h2 className={titleClass}>Leaderboard</h2>
      {scores.length === 0 && (
        <p className="text-stone-500 text-sm">No participants yet.</p>
      )}
      <div className="space-y-2">
        {scores.map((entry, i) => (
          <div
            key={entry.id}
            className={`${entryClass} ${
              i === 0 && entry.points > 0
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-white border border-stone-200'
            }`}
          >
            <span
              className={`${fullscreen ? 'text-xl' : 'text-lg'} font-bold w-8 text-center ${
                i === 0 && entry.points > 0 ? 'text-emerald-700' : 'text-stone-400'
              }`}
            >
              {i + 1}.
            </span>
            <span className={`flex-1 text-stone-800 font-medium truncate ${fullscreen ? 'text-lg' : ''}`}>
              {entry.name}
            </span>
            <span
              className={`font-semibold ${fullscreen ? 'text-lg' : ''} ${
                i === 0 && entry.points > 0 ? 'text-emerald-700' : 'text-stone-500'
              }`}
            >
              {entry.points} {entry.points === 1 ? 'pt' : 'pts'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
