import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterEvent, setFilterEvent] = useState('all')
  const [events, setEvents] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: fb }, { data: ev }] = await Promise.all([
      supabase
        .from('feedback')
        .select('id, text, created_at, event_id, participant_id, events(name), participants(name)')
        .order('created_at', { ascending: false }),
      supabase
        .from('events')
        .select('id, name')
        .neq('status', 'draft')
        .order('name'),
    ])
    setFeedback(fb || [])
    setEvents(ev || [])
    setLoading(false)
  }

  const filtered =
    filterEvent === 'all'
      ? feedback
      : feedback.filter((f) => f.event_id === filterEvent)

  if (loading) return <p className="text-stone-500">Loading feedback...</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-stone-800">Feedback</h2>
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="px-3 py-2 rounded-lg border border-stone-300 text-sm text-stone-800"
        >
          <option value="all">All Events ({feedback.length})</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name} ({feedback.filter((f) => f.event_id === ev.id).length})
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-stone-400 text-sm text-center py-8">No feedback yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((f) => (
            <div
              key={f.id}
              className="rounded-xl bg-white border border-stone-200 p-4"
            >
              <p className="text-sm text-stone-800">{f.text}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
                {f.events?.name && <span>{f.events.name}</span>}
                {f.participants?.name && <span>by {f.participants.name}</span>}
                <span>
                  {new Date(f.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
