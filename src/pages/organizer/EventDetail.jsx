import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.js'
import Leaderboard from '../../components/Leaderboard.jsx'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()

  const [event, setEvent] = useState(null)
  const [config, setConfig] = useState(null)
  const [participants, setParticipants] = useState([])
  const [mostCompletedMission, setMostCompletedMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ending, setEnding] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const loadData = useCallback(async () => {
    // Get event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (eventError || !eventData) {
      setError('Event not found.')
      setLoading(false)
      return
    }

    setEvent(eventData)

    // Get config
    const { data: configData } = await supabase
      .from('event_config')
      .select('*')
      .eq('event_id', id)
      .single()

    setConfig(configData)

    // Get participants with their mission completion counts
    const { data: participantData } = await supabase
      .from('participants')
      .select('id, name, access_code, joined_at')
      .eq('event_id', id)
      .order('name')

    if (participantData) {
      // Get completion counts for each participant
      const withCounts = await Promise.all(
        participantData.map(async (p) => {
          const { data: missions } = await supabase
            .from('participant_missions')
            .select('id, completed')
            .eq('participant_id', p.id)

          const total = missions?.length || 0
          const completed = missions?.filter((m) => m.completed).length || 0
          return { ...p, total, completed }
        })
      )
      setParticipants(withCounts)

      // Find most completed mission (for post-event stats)
      if (participantData.length > 0) {
        const allPIds = participantData.map((p) => p.id)
        const { data: allCompletions } = await supabase
          .from('participant_missions')
          .select('mission_id, completed, missions(text)')
          .eq('completed', true)
          .in('participant_id', allPIds)

        if (allCompletions && allCompletions.length > 0) {
          const counts = {}
          allCompletions.forEach((c) => {
            if (!counts[c.mission_id]) {
              counts[c.mission_id] = { text: c.missions?.text, count: 0 }
            }
            counts[c.mission_id].count++
          })
          const top = Object.values(counts).sort((a, b) => b.count - a.count)[0]
          setMostCompletedMission(top)
        }
      }
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    if (!authLoading && !user) {
      signInWithGoogle()
      return
    }
    if (user) {
      loadData()
    }
  }, [user, authLoading, loadData])

  // Refresh every 30 seconds for live events
  useEffect(() => {
    if (!event || event.status === 'ended') return
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [event?.status, loadData])

  // Update time remaining
  useEffect(() => {
    if (!event || event.status === 'ended') return

    function updateTime() {
      const now = new Date()
      const end = new Date(event.end_time)
      const diff = end - now

      if (diff <= 0) {
        setTimeRemaining('Event time has passed')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`)
      } else {
        setTimeRemaining(`${minutes}m remaining`)
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [event])

  async function handleEndEvent() {
    if (!confirm('Are you sure you want to end this event?')) return

    setEnding(true)
    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'ended' })
      .eq('id', id)

    if (updateError) {
      setError('Failed to end event.')
    } else {
      await loadData()
    }
    setEnding(false)
  }

  async function handleClone() {
    setCloning(true)
    setError('')

    try {
      // Create a new event with same settings but new code/times
      const now = new Date()
      now.setHours(19, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 0, 0, 0)

      const code = generateCode(6)

      const { data: newEvent, error: eventErr } = await supabase
        .from('events')
        .insert({
          organizer_id: user.id,
          name: `${event.name} (Copy)`,
          event_type: event.event_type,
          start_time: now.toISOString(),
          end_time: end.toISOString(),
          event_code: code,
          anonymity_enabled: event.anonymity_enabled,
          status: 'draft',
        })
        .select()
        .single()

      if (eventErr) throw eventErr

      // Clone config
      if (config) {
        await supabase.from('event_config').insert({
          event_id: newEvent.id,
          mission_count: config.mission_count,
          unlock_type: config.unlock_type,
          unlock_schedule: config.unlock_schedule,
          tag_filters: config.tag_filters,
        })
      }

      // Clone participant names (but not access codes or join status)
      if (participants.length > 0) {
        const participantRows = participants.map((p) => ({
          event_id: newEvent.id,
          name: p.name,
          access_code: generateCode(6),
        }))
        await supabase.from('participants').insert(participantRows)
      }

      navigate(`/organizer/new?draft=${newEvent.id}`)
    } catch (err) {
      setError(err.message || 'Failed to clone event.')
    }

    setCloning(false)
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-stone-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <p className="text-stone-500">Loading event...</p>
      </div>
    )
  }

  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/organizer')}
            className="text-emerald-700 font-medium hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const isEnded = event.status === 'ended'
  const isLive = event.status === 'active'
  const joinedCount = participants.filter((p) => p.joined_at).length
  const totalCompletions = participants.reduce((s, p) => s + p.completed, 0)
  const totalPossible = participants.reduce((s, p) => s + p.total, 0)
  const participationRate =
    participants.length > 0
      ? Math.round(
          (participants.filter((p) => p.joined_at && p.completed > 0).length /
            participants.length) *
            100
        )
      : 0
  const avgCompletions =
    participants.length > 0
      ? (totalCompletions / participants.length).toFixed(1)
      : '0'

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <button
          onClick={() => navigate('/organizer')}
          className="text-stone-400 text-sm hover:text-stone-600 transition-colors mb-4"
        >
          &larr; Dashboard
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{event.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {isLive && (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
              {event.status === 'upcoming' && (
                <span className="text-amber-600 text-sm font-medium">
                  Upcoming
                </span>
              )}
              {isEnded && (
                <span className="text-stone-400 text-sm font-medium">
                  Ended &middot;{' '}
                  {new Date(event.start_time).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
              {!isEnded && (
                <span className="text-stone-400 text-sm">
                  {timeRemaining}
                </span>
              )}
            </div>
          </div>

          {!isEnded && (
            <button
              onClick={handleEndEvent}
              disabled={ending}
              className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {ending ? 'Ending...' : 'End Event Early'}
            </button>
          )}
        </div>

        {/* Event code */}
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-emerald-600 text-xs font-medium">Event Code</p>
            <p className="text-xl font-mono font-bold text-emerald-700 tracking-widest">
              {event.event_code}
            </p>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(event.event_code)}
            className="text-emerald-700 text-sm font-medium hover:underline"
          >
            Copy
          </button>
        </div>

        {/* Post-event summary */}
        {isEnded && (
          <div className="rounded-xl bg-white border border-stone-200 p-4 mb-6">
            <h3 className="font-semibold text-stone-800 mb-3">Event Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-400">Total completions</p>
                <p className="text-stone-800 font-semibold text-lg">
                  {totalCompletions}
                </p>
              </div>
              <div>
                <p className="text-stone-400">Avg per person</p>
                <p className="text-stone-800 font-semibold text-lg">
                  {avgCompletions}
                </p>
              </div>
              <div>
                <p className="text-stone-400">Participation rate</p>
                <p className="text-stone-800 font-semibold text-lg">
                  {participationRate}%
                </p>
              </div>
              <div>
                <p className="text-stone-400">Participants joined</p>
                <p className="text-stone-800 font-semibold text-lg">
                  {joinedCount} / {participants.length}
                </p>
              </div>
            </div>
            {mostCompletedMission && (
              <div className="mt-4 pt-3 border-t border-stone-100">
                <p className="text-stone-400 text-sm">Most completed mission</p>
                <p className="text-stone-700 text-sm mt-0.5">
                  "{mostCompletedMission.text}" ({mostCompletedMission.count} completions)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard toggle */}
        {(isEnded || isLive) && (
          <div className="mb-6">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="text-emerald-700 text-sm font-medium hover:underline mb-3"
            >
              {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
            </button>
            {showLeaderboard && (
              <div className="rounded-xl bg-white border border-stone-200 p-4">
                <Leaderboard eventId={event.id} anonymity={event.anonymity_enabled} />
              </div>
            )}
          </div>
        )}

        {/* Participant table */}
        <div className="rounded-xl bg-white border border-stone-200 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">
              Participants ({participants.length})
            </h3>
            {participants.length > 0 && (
              <button
                onClick={() => {
                  const codes = participants
                    .map((p) => `${p.name}: ${p.access_code}`)
                    .join('\n')
                  navigator.clipboard?.writeText(
                    `Event: ${event.name}\nEvent Code: ${event.event_code}\n\nAccess Codes:\n${codes}`
                  )
                }}
                className="text-emerald-700 text-xs font-medium hover:underline"
              >
                Copy All
              </button>
            )}
          </div>

          {participants.length === 0 ? (
            <p className="text-stone-400 text-sm px-4 py-6 text-center">
              No participants yet.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {/* Table header */}
              <div className="grid grid-cols-12 px-4 py-2 text-xs text-stone-400 font-medium uppercase tracking-wider">
                <div className="col-span-4">Name</div>
                <div className="col-span-3">Access Code</div>
                <div className="col-span-2 text-center">Joined</div>
                <div className="col-span-3 text-right">Completed</div>
              </div>

              {participants.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 px-4 py-3 items-center text-sm"
                >
                  <div className="col-span-4 text-stone-800 truncate">
                    {p.name}
                  </div>
                  <div className="col-span-3 font-mono text-stone-500 text-xs tracking-wide">
                    {p.access_code}
                  </div>
                  <div className="col-span-2 text-center">
                    {p.joined_at ? (
                      <span className="text-emerald-600 font-medium">Yes</span>
                    ) : (
                      <span className="text-stone-300">&mdash;</span>
                    )}
                  </div>
                  <div className="col-span-3 text-right text-stone-600">
                    {p.completed} / {p.total}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClone}
            disabled={cloning}
            className="flex-1 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors text-sm disabled:opacity-50"
          >
            {cloning ? 'Cloning...' : 'Clone Event'}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      </div>
    </div>
  )
}

function generateCode(length) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}
