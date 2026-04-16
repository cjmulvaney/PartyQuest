import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useTheme } from '../../hooks/useTheme.jsx'
import { generateCode } from '../../lib/missions.js'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, loading: authLoading, signInWithGoogle, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [cloning, setCloning] = useState(null) // event id being cloned
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showGuide, setShowGuide] = useState(
    () => !localStorage.getItem('pq_organizer_guide_dismissed')
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      if (sessionStorage.getItem('pq_signed_out')) {
        navigate('/')
        return
      }
      signInWithGoogle()
      return
    }
    sessionStorage.removeItem('pq_signed_out')
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
      const eventIds = data.map((e) => e.id)

      // Batch: get all participants + mission stats in two queries instead of N+1
      const [{ data: allParticipants }, { data: allPMRaw }] = await Promise.all([
        supabase
          .from('participants')
          .select('id, event_id')
          .in('event_id', eventIds),
        // We need participant IDs to query participant_missions
        supabase
          .from('participants')
          .select('id, event_id')
          .in('event_id', eventIds),
      ])

      const participantIds = (allParticipants || []).map((p) => p.id)

      // Get all participant_missions for these participants
      let allMissions = []
      if (participantIds.length > 0) {
        for (let i = 0; i < participantIds.length; i += 500) {
          const chunk = participantIds.slice(i, i + 500)
          const { data: pmData } = await supabase
            .from('participant_missions')
            .select('participant_id, completed')
            .in('participant_id', chunk)
          if (pmData) allMissions.push(...pmData)
        }
      }

      // Build lookup maps
      const participantsByEvent = {}
      const participantToEvent = {}
      ;(allParticipants || []).forEach((p) => {
        if (!participantsByEvent[p.event_id]) participantsByEvent[p.event_id] = []
        participantsByEvent[p.event_id].push(p.id)
        participantToEvent[p.id] = p.event_id
      })

      const missionsByEvent = {}
      allMissions.forEach((pm) => {
        const eventId = participantToEvent[pm.participant_id]
        if (!eventId) return
        if (!missionsByEvent[eventId]) missionsByEvent[eventId] = { total: 0, completed: 0 }
        missionsByEvent[eventId].total++
        if (pm.completed) missionsByEvent[eventId].completed++
      })

      const eventsWithStats = data.map((event) => {
        const stats = missionsByEvent[event.id] || { total: 0, completed: 0 }
        return {
          ...event,
          participantCount: (participantsByEvent[event.id] || []).length,
          totalMissions: stats.total,
          completedMissions: stats.completed,
          completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        }
      })
      setEvents(eventsWithStats)
    }

    setLoading(false)
  }

  async function handleClone(e, event) {
    e.stopPropagation()
    setCloning(event.id)
    try {
      const now = new Date()
      now.setHours(19, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 0, 0, 0)

      const code = generateCode(6)

      // Get config from original event
      const { data: origConfig } = await supabase
        .from('event_config')
        .select('*')
        .eq('event_id', event.id)
        .single()

      const { data: newEvent, error: eventErr } = await supabase
        .from('events')
        .insert({
          organizer_id: user.id,
          name: `${event.name} (Copy)`,
          event_type: event.event_type || 'house party',
          start_time: now.toISOString(),
          end_time: end.toISOString(),
          event_code: code,
          status: 'upcoming',
        })
        .select()
        .single()

      if (eventErr) throw eventErr

      if (origConfig) {
        await supabase.from('event_config').insert({
          event_id: newEvent.id,
          mission_count: origConfig.mission_count,
          unlock_type: origConfig.unlock_type,
          unlock_schedule: origConfig.unlock_schedule,
          tag_filters: origConfig.tag_filters,
        })
      }

      navigate(`/organizer/event/${newEvent.id}`)
    } catch (err) {
      console.error('Clone failed:', err)
      alert(err.message || 'Failed to clone event')
    }
    setCloning(null)
  }

  // Sorting + filtering
  const sortedFiltered = useMemo(() => {
    let result = [...events]
    if (filterStatus !== 'all') {
      if (filterStatus === 'active_upcoming') {
        result = result.filter((e) => e.status === 'active' || e.status === 'upcoming')
      } else {
        result = result.filter((e) => e.status === filterStatus)
      }
    }
    result.sort((a, b) => {
      let aVal = a[sortKey]
      let bVal = b[sortKey]
      if (typeof aVal === 'string') {
        aVal = (aVal || '').toLowerCase()
        bVal = (bVal || '').toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [events, filterStatus, sortKey, sortDir])

  const activeEvents = sortedFiltered.filter((e) => e.status === 'active' || e.status === 'upcoming')
  const pastEvents = sortedFiltered.filter((e) => e.status === 'ended')

  if (authLoading || (!user && !authLoading)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="pq-spinner" />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
            Loading...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header Bar */}
      <header
        className="w-full animate-fade-in"
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border-light)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1
              className="text-2xl font-bold cursor-pointer"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}
              onClick={() => navigate('/organizer')}
            >
              Party Quest
            </h1>
            <nav className="hidden md:flex items-center gap-4">
              <button
                onClick={() => navigate('/organizer')}
                className="pq-btn pq-btn-ghost text-sm"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-primary)' }}
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/join')}
                className="pq-btn pq-btn-ghost text-sm"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}
              >
                Your Participant View
              </button>
              <button
                onClick={() => navigate('/organizer/settings')}
                className="pq-btn pq-btn-ghost text-sm"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}
              >
                Settings
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              className="theme-toggle"
              data-active={theme === 'dark'}
              onClick={toggleTheme}
            />
            <span
              className="hidden sm:inline text-sm"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
            >
              {user.email}
            </span>
            <button
              onClick={async () => {
                await signOut()
                navigate('/')
              }}
              className="pq-btn pq-btn-ghost text-sm"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Title + New Event */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in stagger-1">
          <div>
            <h2
              className="text-3xl font-bold"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
            >
              Your Events
            </h2>
            <p
              className="mt-1 text-sm"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}
            >
              Create, manage, and track your party quests
            </p>
          </div>
          <button
            onClick={() => navigate('/organizer/new')}
            className="pq-btn pq-btn-primary text-lg px-6 py-3"
            style={{ fontFamily: 'var(--font-heading)', borderRadius: 'var(--radius-lg)' }}
          >
            + New Event
          </button>
        </div>

        {/* Sort + Filter controls */}
        {events.length > 1 && (
          <div className="flex flex-wrap items-center gap-3 mb-6 animate-fade-in stagger-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pq-input"
              style={{ width: 'auto', fontSize: '0.8125rem' }}
            >
              <option value="all">All Statuses</option>
              <option value="active_upcoming">Active & Upcoming</option>
              <option value="active">Active Only</option>
              <option value="upcoming">Upcoming Only</option>
              <option value="ended">Ended Only</option>
            </select>
            <select
              value={`${sortKey}:${sortDir}`}
              onChange={(e) => {
                const [k, d] = e.target.value.split(':')
                setSortKey(k)
                setSortDir(d)
              }}
              className="pq-input"
              style={{ width: 'auto', fontSize: '0.8125rem' }}
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="start_time:desc">Start Date (latest)</option>
              <option value="start_time:asc">Start Date (earliest)</option>
              <option value="name:asc">Name (A-Z)</option>
              <option value="name:desc">Name (Z-A)</option>
              <option value="participantCount:desc">Most Participants</option>
              <option value="completionRate:desc">Highest Completion</option>
            </select>
          </div>
        )}

        {/* First-time organizer guide */}
        {showGuide && (
          <div
            className="pq-card mb-8 relative animate-slide-up stagger-2"
            style={{
              background: 'var(--color-primary-light)',
              border: '1px solid var(--color-primary-subtle)',
            }}
          >
            <button
              onClick={() => {
                setShowGuide(false)
                localStorage.setItem('pq_organizer_guide_dismissed', '1')
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center"
              style={{
                color: 'var(--color-primary)',
                borderRadius: 'var(--radius-full)',
                background: 'transparent',
                border: 'none',
                fontSize: '1.25rem',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-primary-subtle)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              &times;
            </button>
            <h3
              className="font-semibold text-lg mb-4"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}
            >
              Welcome! Here's how Party Quest works:
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { step: '1', text: 'Create an event -- pick a name, set the date, and choose how many missions each guest gets' },
                { step: '2', text: 'Invite your guests -- share the invite link or hand out access codes' },
                { step: '3', text: 'Guests get secret missions -- fun challenges to complete during your event' },
                { step: '4', text: 'Watch it unfold -- track completions and see the leaderboard update in real time' },
              ].map(({ step, text }) => (
                <div key={step} className="flex gap-3 items-start">
                  <span
                    className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-sm font-bold"
                    style={{
                      background: 'var(--color-primary-subtle)',
                      color: 'var(--color-primary)',
                      borderRadius: 'var(--radius-full)',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    {step}
                  </span>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-body)' }}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="pq-spinner" />
            <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
              Loading events...
            </p>
          </div>
        ) : (
          <>
            {/* Active & Upcoming Events */}
            <section className="mb-10 animate-fade-in stagger-3">
              <h3
                className="text-xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
              >
                Active & Upcoming
              </h3>
              {activeEvents.length === 0 ? (
                <div
                  className="pq-card flex flex-col items-center py-10"
                  style={{ textAlign: 'center' }}
                >
                  <p
                    className="text-lg font-medium mb-2"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text-secondary)' }}
                  >
                    No active events yet
                  </p>
                  <p
                    className="text-sm mb-4"
                    style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
                  >
                    Create your first event to get started
                  </p>
                  <button
                    onClick={() => navigate('/organizer/new')}
                    className="pq-btn pq-btn-secondary"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    + New Event
                  </button>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeEvents.map((event, i) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => navigate(`/organizer/event/${event.id}`)}
                      onClone={(e) => handleClone(e, event)}
                      cloning={cloning === event.id}
                      staggerIndex={i}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Past Events */}
            <section className="animate-fade-in stagger-4">
              <h3
                className="text-xl font-bold mb-4"
                style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
              >
                Past Events
              </h3>
              {pastEvents.length === 0 ? (
                <p
                  className="text-sm py-4"
                  style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-muted)' }}
                >
                  No past events yet. Completed events will appear here.
                </p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastEvents.map((event, i) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => navigate(`/organizer/event/${event.id}`)}
                      onClone={(e) => handleClone(e, event)}
                      cloning={cloning === event.id}
                      isPast
                      staggerIndex={i}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

function EventCard({ event, onClick, onClone, cloning = false, isPast = false, staggerIndex = 0 }) {
  const statusLabel =
    event.status === 'active'
      ? 'Live'
      : event.status === 'upcoming'
      ? 'Upcoming'
      : 'Ended'

  const badgeClass =
    event.status === 'active'
      ? 'pq-badge pq-badge-success'
      : event.status === 'upcoming'
      ? 'pq-badge pq-badge-warning'
      : 'pq-badge pq-badge-muted'

  const staggerClass = staggerIndex < 6 ? `stagger-${staggerIndex + 1}` : ''

  const dateDisplay = event.start_time
    ? new Date(event.start_time).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const timeDisplay = event.start_time
    ? new Date(event.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  return (
    <button
      onClick={onClick}
      className={`pq-card pq-card-interactive w-full text-left animate-scale-in ${staggerClass}`}
      style={{
        cursor: 'pointer',
        opacity: isPast ? 0.75 : 1,
      }}
    >
      <div className="flex flex-col gap-3">
        {/* Top row: name + badge */}
        <div className="flex items-start justify-between gap-2">
          <h4
            className="font-bold text-base truncate"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-text)' }}
          >
            {event.name}
          </h4>
          <span className={badgeClass}>{statusLabel}</span>
        </div>

        {/* Event details */}
        <div className="flex flex-col gap-1.5">
          {dateDisplay && (
            <div className="flex items-center gap-2">
              <svg
                width="14" height="14" viewBox="0 0 16 16" fill="none"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              >
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 7h12" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span
                className="text-sm"
                style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}
              >
                {dateDisplay} {timeDisplay && `at ${timeDisplay}`}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none"
              style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
            >
              <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span
              className="text-sm"
              style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}
            >
              {event.participantCount} participant{event.participantCount !== 1 ? 's' : ''}
            </span>
          </div>
          {event.event_code && (
            <div className="flex items-center gap-2">
              <svg
                width="14" height="14" viewBox="0 0 16 16" fill="none"
                style={{ color: 'var(--color-text-muted)', flexShrink: 0 }}
              >
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span
                className="text-sm font-mono tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {event.event_code}
              </span>
            </div>
          )}
        </div>

        {/* Completion rate bar */}
        {event.totalMissions > 0 && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                {event.completedMissions}/{event.totalMissions} missions
              </span>
              <span
                className="text-xs font-semibold"
                style={{
                  color: event.completionRate >= 75
                    ? 'var(--color-success)'
                    : event.completionRate >= 40
                    ? 'var(--color-warning)'
                    : 'var(--color-primary)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {event.completionRate}%
              </span>
            </div>
            <div
              style={{
                height: '4px',
                backgroundColor: 'var(--color-border-light)',
                borderRadius: 'var(--radius-full)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${event.completionRate}%`,
                  height: '100%',
                  backgroundColor: event.completionRate >= 75
                    ? 'var(--color-success)'
                    : event.completionRate >= 40
                    ? 'var(--color-warning)'
                    : 'var(--color-primary)',
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        )}

        {/* Bottom row: manage + clone */}
        <div className="flex items-center justify-between mt-1">
          <button
            onClick={onClone}
            disabled={cloning}
            className="pq-btn pq-btn-ghost"
            style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              padding: '0.25rem 0.5rem',
            }}
          >
            {cloning ? 'Cloning...' : 'Clone'}
          </button>
          <div
            className="flex items-center"
            style={{ color: 'var(--color-primary)' }}
          >
            <span
              className="text-sm font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Manage
            </span>
            <svg
              width="16" height="16" viewBox="0 0 16 16" fill="none"
              className="ml-1"
            >
              <path
                d="M6 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </button>
  )
}
