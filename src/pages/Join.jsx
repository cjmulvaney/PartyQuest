import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Join() {
  const navigate = useNavigate()
  const [eventCode, setEventCode] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const evCode = eventCode.toUpperCase().trim()
    const acCode = accessCode.toUpperCase().trim()

    // Look up the event
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, name, status')
      .eq('event_code', evCode)
      .single()

    if (eventErr || !event) {
      setError('Event not found. Check your event code.')
      setLoading(false)
      return
    }

    if (event.status === 'ended') {
      setError('This event has already ended.')
      setLoading(false)
      return
    }

    // Look up the participant by access code within this event
    const { data: participant, error: partErr } = await supabase
      .from('participants')
      .select('id, access_code, joined_at')
      .eq('event_id', event.id)
      .eq('access_code', acCode)
      .single()

    if (partErr || !participant) {
      setError('Access code not found for this event. Check both codes and try again.')
      setLoading(false)
      return
    }

    // Mark as joined if first time
    if (!participant.joined_at) {
      await supabase
        .from('participants')
        .update({ joined_at: new Date().toISOString() })
        .eq('id', participant.id)
    }

    setLoading(false)
    navigate(`/play/${participant.access_code}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="max-w-sm w-full space-y-6">
        <button
          onClick={() => navigate('/')}
          className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
        >
          &larr; Back
        </button>

        <h1 className="text-3xl font-bold text-emerald-700">Join Event</h1>

        <form onSubmit={handleJoin} className="space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Your Access Code
            </label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="Your personal code"
              maxLength={8}
              className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading || eventCode.trim().length < 3 || accessCode.trim().length < 3}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Event'}
          </button>
        </form>

        <p className="text-stone-400 text-xs text-center">
          Both codes are provided by your event organizer.
        </p>
      </div>
    </div>
  )
}
