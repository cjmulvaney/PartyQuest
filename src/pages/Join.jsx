import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Join() {
  const navigate = useNavigate()
  const [step, setStep] = useState('code') // 'code' | 'name' | 'showCode'
  const [eventCode, setEventCode] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [name, setName] = useState('')
  const [event, setEvent] = useState(null)
  const [newAccessCode, setNewAccessCode] = useState('') // shown after first join
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEventCode(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: fetchError } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('event_code', eventCode.toUpperCase().trim())
      .single()

    setLoading(false)

    if (fetchError || !data) {
      setError('Event not found. Check the code and try again.')
      return
    }

    if (data.status === 'ended') {
      setError('This event has already ended.')
      return
    }

    setEvent(data)
    setStep('name')
  }

  async function handleReturning(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const code = accessCode.toUpperCase().trim()
    const { data, error: fetchError } = await supabase
      .from('participants')
      .select('id, access_code')
      .eq('access_code', code)
      .single()

    setLoading(false)

    if (fetchError || !data) {
      setError('Access code not found. Check and try again.')
      return
    }

    navigate(`/play/${data.access_code}`)
  }

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter your name.')
      setLoading(false)
      return
    }

    // Check if a participant slot exists with this name (pre-registered)
    const { data: existing } = await supabase
      .from('participants')
      .select('id, access_code, joined_at')
      .eq('event_id', event.id)
      .ilike('name', trimmedName)
      .single()

    if (existing) {
      if (existing.joined_at) {
        // Already joined before — they need to use their access code
        setError('This name has already joined. Use your access code to return to your missions.')
        setLoading(false)
        return
      }

      // First time joining — mark as joined and show access code
      await supabase
        .from('participants')
        .update({ joined_at: new Date().toISOString() })
        .eq('id', existing.id)

      setNewAccessCode(existing.access_code)
      setLoading(false)
      setStep('showCode')
      return
    }

    // Walk-up participant — create new slot
    const newCode = generateAccessCode()

    const { data: newParticipant, error: insertError } = await supabase
      .from('participants')
      .insert({
        event_id: event.id,
        name: trimmedName,
        access_code: newCode,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      setError('Failed to join event. Please try again.')
      setLoading(false)
      return
    }

    // Auto-assign missions for walk-up participant
    await assignMissions(newParticipant.id, event.id)

    setNewAccessCode(newCode)
    setLoading(false)
    setStep('showCode')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="max-w-sm w-full space-y-6">
        {step !== 'showCode' && (
          <button
            onClick={() => {
              if (step === 'name') {
                setStep('code')
                setError('')
              } else {
                navigate('/')
              }
            }}
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
          >
            &larr; Back
          </button>
        )}

        <h1 className="text-3xl font-bold text-emerald-700">Join Event</h1>

        {step === 'code' && (
          <>
            <form onSubmit={handleEventCode} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Event Code
                </label>
                <input
                  type="text"
                  value={eventCode}
                  onChange={(e) => setEventCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  autoFocus
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || eventCode.trim().length < 3}
                className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
              >
                {loading ? 'Finding event...' : 'Find Event'}
              </button>
            </form>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-300" />
              <span className="text-xs uppercase tracking-widest text-stone-400 font-medium">
                or
              </span>
              <div className="h-px flex-1 bg-stone-300" />
            </div>

            <form onSubmit={handleReturning} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Returning? Enter your access code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="Your access code"
                  className="w-full text-center text-lg font-mono tracking-widest px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading || accessCode.trim().length < 3}
                className="w-full py-3 rounded-xl border border-stone-300 text-stone-600 font-semibold hover:bg-stone-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Looking up...' : 'Return to My Missions'}
              </button>
            </form>
          </>
        )}

        {step === 'name' && event && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-emerald-800 font-semibold text-lg">{event.name}</p>
              <p className="text-emerald-600 text-sm mt-1">
                {event.status === 'active' ? 'Live now' : 'Upcoming'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                autoFocus
              />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Event'}
            </button>
          </form>
        )}

        {step === 'showCode' && (
          <div className="space-y-5">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-3">
              <p className="text-emerald-800 font-medium">You're in! Here's your personal access code:</p>
              <p className="text-3xl font-mono font-bold text-emerald-700 tracking-widest">
                {newAccessCode}
              </p>
              <p className="text-emerald-600 text-sm">
                Save this! You'll need it to get back to your missions.
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard?.writeText(newAccessCode)
              }}
              className="w-full py-3 rounded-xl border border-stone-300 text-stone-600 font-semibold hover:bg-stone-200 transition-colors"
            >
              Copy Code
            </button>

            <button
              onClick={() => navigate(`/play/${newAccessCode}`)}
              className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
            >
              Go to My Missions
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function assignMissions(participantId, eventId) {
  // Get event config
  const { data: config } = await supabase
    .from('event_config')
    .select('mission_count, unlock_type, unlock_schedule, tag_filters')
    .eq('event_id', eventId)
    .single()

  if (!config) return

  // Get eligible missions based on tag filters
  let query = supabase
    .from('missions')
    .select('id')
    .eq('active', true)

  // If tag filters are set, filter by them
  if (config.tag_filters && config.tag_filters.length > 0) {
    query = query.overlaps('tags', config.tag_filters)
  }

  const { data: missions } = await query

  if (!missions || missions.length === 0) return

  // Get already-assigned mission IDs for this event to minimize overlap
  const { data: existingAssignments } = await supabase
    .from('participant_missions')
    .select('mission_id, participant_id')
    .in(
      'participant_id',
      (
        await supabase
          .from('participants')
          .select('id')
          .eq('event_id', eventId)
      ).data?.map((p) => p.id) || []
    )

  // Count how many times each mission has been assigned
  const assignmentCounts = {}
  missions.forEach((m) => (assignmentCounts[m.id] = 0))
  existingAssignments?.forEach((a) => {
    if (assignmentCounts[a.mission_id] !== undefined) {
      assignmentCounts[a.mission_id]++
    }
  })

  // Sort missions by assignment count (least assigned first) then shuffle within same count
  const sorted = missions
    .map((m) => ({ id: m.id, count: assignmentCounts[m.id] || 0 }))
    .sort((a, b) => a.count - b.count || Math.random() - 0.5)

  const selected = sorted.slice(0, config.mission_count)

  // Determine unlock times
  const unlockTimes = []
  if (config.unlock_type === 'timed' && config.unlock_schedule?.length > 0) {
    for (let i = 0; i < selected.length; i++) {
      unlockTimes.push(
        config.unlock_schedule[i] || config.unlock_schedule[config.unlock_schedule.length - 1]
      )
    }
  }

  // Insert participant missions
  const rows = selected.map((m, i) => ({
    participant_id: participantId,
    mission_id: m.id,
    unlock_time:
      config.unlock_type === 'timed' && unlockTimes[i]
        ? unlockTimes[i]
        : null,
  }))

  await supabase.from('participant_missions').insert(rows)
}
