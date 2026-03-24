import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'

export default function Register() {
  const { eventCode } = useParams()
  const navigate = useNavigate()
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function loadEvent() {
      const code = eventCode.toUpperCase().trim()
      const { data, error: err } = await supabase
        .from('events')
        .select('id, name, event_type, start_time, end_time, status, max_participants')
        .eq('event_code', code)
        .single()

      if (err || !data) {
        setError('Event not found. Check your invite link.')
        setLoading(false)
        return
      }

      if (data.status === 'ended') {
        setError('This event has already ended.')
        setLoading(false)
        return
      }

      setEvent(data)
      setLoading(false)
    }
    loadEvent()
  }, [eventCode])

  async function handleRegister(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      // Check max participants
      if (event.max_participants) {
        const { count } = await supabase
          .from('participants')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', event.id)
          .eq('is_active', true)

        if (count >= event.max_participants) {
          setError('This event is full. No more spots available.')
          setSubmitting(false)
          return
        }
      }

      const accessCode = generateCode(6)

      const { data: participant, error: partErr } = await supabase
        .from('participants')
        .insert({
          event_id: event.id,
          name: name.trim(),
          access_code: accessCode,
          joined_at: new Date().toISOString(),
          source: 'self',
          phone: phone.trim() || null,
        })
        .select()
        .single()

      if (partErr) throw partErr

      // If event is active, assign missions immediately
      if (event.status === 'active') {
        const { data: config } = await supabase
          .from('event_config')
          .select('*')
          .eq('event_id', event.id)
          .single()

        if (config) {
          await assignMissions(participant, config)
        }
      }

      setSuccess({ accessCode, participantId: participant.id })
    } catch (err) {
      setError(err.message || 'Failed to register. Please try again.')
    }

    setSubmitting(false)
  }

  async function assignMissions(participant, config) {
    let query = supabase
      .from('missions')
      .select('id')
      .eq('active', true)

    if (config.tag_filters?.length > 0) {
      query = query.in('category_id', config.tag_filters)
    }

    const { data: missions } = await query
    if (!missions || missions.length === 0) return

    const shuffled = [...missions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, config.mission_count)

    const rows = selected.map((m) => ({
      participant_id: participant.id,
      mission_id: m.id,
    }))

    if (rows.length > 0) {
      await supabase.from('participant_missions').insert(rows)
    }
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
            onClick={() => navigate('/')}
            className="text-emerald-700 font-medium hover:underline"
          >
            Go home
          </button>
        </div>
      </div>
    )
  }

  // Success state — show access code and play link
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 space-y-3">
            <p className="text-4xl">🎉</p>
            <h2 className="text-2xl font-bold text-emerald-700">You're in!</h2>
            <p className="text-emerald-600">Welcome to {event.name}</p>

            <div className="mt-4">
              <p className="text-emerald-600 text-sm font-medium mb-1">Your Access Code</p>
              <p className="text-3xl font-mono font-bold text-emerald-700 tracking-widest">
                {success.accessCode}
              </p>
              <p className="text-emerald-600 text-xs mt-1">
                Save this code — you'll need it to rejoin
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(`/play/${success.accessCode}`)}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
          >
            Start Playing
          </button>

          <button
            onClick={() => navigator.clipboard?.writeText(success.accessCode)}
            className="w-full py-3 rounded-xl border border-stone-300 text-stone-600 font-medium hover:bg-stone-200 transition-colors"
          >
            Copy Access Code
          </button>
        </div>
      </div>
    )
  }

  const eventDate = new Date(event.start_time).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-emerald-700">Party Quest</h1>
          <p className="text-stone-400 text-sm mt-1">You've been invited!</p>
        </div>

        {/* Event info */}
        <div className="rounded-xl bg-white border border-stone-200 p-4 text-center space-y-1">
          <h2 className="text-xl font-bold text-stone-800">{event.name}</h2>
          <p className="text-stone-500 text-sm capitalize">{event.event_type}</p>
          <p className="text-stone-400 text-sm">{eventDate}</p>
        </div>

        {/* Registration form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Your Name *
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

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Phone Number (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Registering...' : 'Join Event'}
          </button>
        </form>

        <p className="text-stone-400 text-xs text-center">
          By joining, you'll receive missions to complete during the event.
        </p>
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
