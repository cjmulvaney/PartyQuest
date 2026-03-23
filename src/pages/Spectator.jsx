import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import Leaderboard from '../components/Leaderboard.jsx'

export default function Spectator() {
  const navigate = useNavigate()
  const [eventCode, setEventCode] = useState('')
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: fetchError } = await supabase
      .from('events')
      .select('id, name, anonymity_enabled, status')
      .eq('event_code', eventCode.toUpperCase().trim())
      .in('status', ['active', 'upcoming'])
      .single()

    setLoading(false)

    if (fetchError || !data) {
      setError('Event not found. Check the code and try again.')
      return
    }

    setEvent(data)
  }

  if (event) {
    return (
      <div className="min-h-screen bg-stone-100 px-4 pt-6 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-stone-400 text-sm">Spectator View</p>
              <h1 className="text-2xl font-bold text-stone-800">{event.name}</h1>
            </div>
            <button
              onClick={() => setEvent(null)}
              className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
            >
              Exit
            </button>
          </div>
          <Leaderboard
            eventId={event.id}
            anonymity={event.anonymity_enabled}
            fullscreen
          />
        </div>
      </div>
    )
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

        <h1 className="text-3xl font-bold text-emerald-700">Spectator View</h1>
        <p className="text-stone-500 text-sm">
          Enter the event code to view the leaderboard.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value.toUpperCase())}
            placeholder="Event Code"
            maxLength={6}
            className="w-full text-center text-2xl font-mono tracking-widest px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
            autoFocus
          />
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || eventCode.trim().length < 3}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'View Leaderboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
