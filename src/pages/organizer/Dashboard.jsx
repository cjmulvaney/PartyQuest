import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.js'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(
    () => !localStorage.getItem('pq_organizer_guide_dismissed')
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      signInWithGoogle()
      return
    }
    loadEvents()
  }, [user, authLoading])

  async function loadEvents() {
    setLoading(true)

    const { data } = await supabase
      .from('events')
      .select('id, name, status, start_time, end_time, event_code, created_at')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      // Get participant counts for each event
      const eventsWithCounts = await Promise.all(
        data.map(async (event) => {
          const { count } = await supabase
            .from('participants')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id)
          return { ...event, participantCount: count || 0 }
        })
      )
      setEvents(eventsWithCounts)
    }

    setLoading(false)
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

  const activeEvents = events.filter(
    (e) => e.status === 'active' || e.status === 'upcoming'
  )
  const pastEvents = events.filter((e) => e.status === 'ended')

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-emerald-700">Party Quest</h1>
            <p className="text-stone-400 text-sm mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/join')}
              className="text-emerald-700 text-sm font-medium hover:underline"
            >
              Join an Event
            </button>
            <button
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
              className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* New Event button */}
        <button
          onClick={() => navigate('/organizer/new')}
          className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors mb-8"
        >
          + New Event
        </button>

        {/* First-time organizer guide */}
        {showGuide && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-5 mb-8 relative">
            <button
              onClick={() => {
                setShowGuide(false)
                localStorage.setItem('pq_organizer_guide_dismissed', '1')
              }}
              className="absolute top-3 right-3 text-emerald-400 hover:text-emerald-600 text-lg leading-none"
            >
              &times;
            </button>
            <h3 className="font-semibold text-emerald-800 mb-3">Welcome! Here's how Party Quest works:</h3>
            <div className="space-y-2 text-sm text-emerald-700">
              <p><span className="font-bold">1.</span> Create an event — pick a name, set the date, and choose how many missions each guest gets</p>
              <p><span className="font-bold">2.</span> Invite your guests — share the invite link or hand out access codes</p>
              <p><span className="font-bold">3.</span> Guests get secret missions — fun challenges to complete during your event</p>
              <p><span className="font-bold">4.</span> Watch it unfold — track completions and see the leaderboard update in real time</p>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-stone-500 text-center py-8">Loading events...</p>
        ) : (
          <>
            {/* Active Events */}
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-stone-700 mb-3">
                Active Events
              </h2>
              {activeEvents.length === 0 ? (
                <p className="text-stone-400 text-sm">No active events.</p>
              ) : (
                <div className="space-y-3">
                  {activeEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => navigate(`/organizer/event/${event.id}`)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Past Events */}
            <section>
              <h2 className="text-lg font-semibold text-stone-700 mb-3">
                Past Events
              </h2>
              {pastEvents.length === 0 ? (
                <p className="text-stone-400 text-sm">No past events yet.</p>
              ) : (
                <div className="space-y-3">
                  {pastEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => navigate(`/organizer/event/${event.id}`)}
                      isPast
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function EventCard({ event, onClick, isPast = false }) {
  const statusLabel =
    event.status === 'active'
      ? 'Live'
      : event.status === 'upcoming'
      ? 'Upcoming'
      : 'Ended'

  const statusColor =
    event.status === 'active'
      ? 'text-emerald-600'
      : event.status === 'upcoming'
      ? 'text-amber-600'
      : 'text-stone-400'

  const dateStr = isPast
    ? new Date(event.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl bg-white border border-stone-200 p-4 text-left hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-800 truncate">{event.name}</p>
          <div className="flex items-center gap-3 mt-1">
            {dateStr && (
              <span className="text-stone-400 text-sm">{dateStr}</span>
            )}
            <span className="text-stone-400 text-sm">
              {event.participantCount} participant{event.participantCount !== 1 ? 's' : ''}
            </span>
            <span className={`text-sm font-medium ${statusColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
        <span className="text-stone-300 text-lg ml-3">&rarr;</span>
      </div>
    </button>
  )
}
