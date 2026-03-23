import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

export default function EventsPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    const { data } = await supabase
      .from('events')
      .select('id, name, event_type, status, start_time, end_time, event_code, created_at, organizer_id')
      .neq('status', 'draft')
      .order('created_at', { ascending: false })

    if (!data) {
      setLoading(false)
      return
    }

    // Get participant counts and completion stats
    const enriched = await Promise.all(
      data.map(async (event) => {
        const [{ count: participantCount }, { data: completions }] = await Promise.all([
          supabase
            .from('participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id),
          supabase
            .from('participant_missions')
            .select('completed, participant_id')
            .in(
              'participant_id',
              (
                await supabase
                  .from('participants')
                  .select('id')
                  .eq('event_id', event.id)
              ).data?.map((p) => p.id) || []
            ),
        ])

        const totalMissions = completions?.length || 0
        const completedMissions = completions?.filter((c) => c.completed).length || 0
        const completionRate =
          totalMissions > 0 ? Math.round((completedMissions / totalMissions) * 100) : 0

        return {
          ...event,
          participantCount: participantCount || 0,
          totalMissions,
          completedMissions,
          completionRate,
        }
      })
    )

    setEvents(enriched)
    setLoading(false)
  }

  if (loading) return <p className="text-stone-500">Loading events...</p>

  const statusBadge = (status) => {
    const colors = {
      active: 'bg-emerald-100 text-emerald-700',
      upcoming: 'bg-amber-100 text-amber-700',
      ended: 'bg-stone-100 text-stone-500',
    }
    return colors[status] || colors.ended
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-stone-800">All Events</h2>

      <div className="text-sm text-stone-400">{events.length} event{events.length !== 1 ? 's' : ''}</div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-400 border-b border-stone-200">
              <th className="pb-2 font-medium">Event</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Code</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium">Participants</th>
              <th className="pb-2 font-medium">Completions</th>
              <th className="pb-2 font-medium">Rate</th>
              <th className="pb-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b border-stone-100">
                <td className="py-3 text-stone-800 font-medium">{event.name}</td>
                <td className="py-3 text-stone-500 capitalize">{event.event_type}</td>
                <td className="py-3 font-mono text-stone-500">{event.event_code}</td>
                <td className="py-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusBadge(
                      event.status
                    )}`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="py-3 text-stone-600">{event.participantCount}</td>
                <td className="py-3 text-stone-600">
                  {event.completedMissions}/{event.totalMissions}
                </td>
                <td className="py-3 text-stone-600">{event.completionRate}%</td>
                <td className="py-3 text-stone-400">
                  {new Date(event.start_time).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {events.length === 0 && (
        <p className="text-stone-400 text-sm text-center py-8">No events yet.</p>
      )}
    </div>
  )
}
