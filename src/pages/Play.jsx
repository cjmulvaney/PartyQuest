import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { fireConfetti } from '../lib/confetti.js'
import MissionCard from '../components/MissionCard.jsx'
import LockedMission from '../components/LockedMission.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import ActivityFeed from '../components/ActivityFeed.jsx'
import FeedbackButton from '../components/FeedbackButton.jsx'

const TAB_ICONS = {
  missions: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  ),
  leaderboard: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
    </svg>
  ),
  feed: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
}

export default function Play() {
  const { accessCode } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('missions')
  const [participant, setParticipant] = useState(null)
  const [event, setEvent] = useState(null)
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(
    () => !localStorage.getItem('pq_player_welcome_dismissed')
  )
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const unlockTimersRef = useRef([])
  const prevUnlockedRef = useRef(new Set())

  const loadData = useCallback(async () => {
    const { data: part, error: partErr } = await supabase
      .from('participants')
      .select('id, name, event_id')
      .eq('access_code', accessCode)
      .single()

    if (partErr || !part) {
      setError('Invalid access code.')
      setLoading(false)
      return
    }

    setParticipant(part)

    const { data: evt } = await supabase
      .from('events')
      .select('id, name, status, anonymity_enabled, feed_mode, feed_photos_enabled, feed_comments_enabled')
      .eq('id', part.event_id)
      .single()

    setEvent(evt)

    const { data: pm } = await supabase
      .from('participant_missions')
      .select('id, completed, notes, photo_url, completed_at, unlock_time, mission_id, missions(text, category_id, categories(name))')
      .eq('participant_id', part.id)
      .order('unlock_time', { ascending: true, nullsFirst: true })

    setMissions(pm || [])
    setLoading(false)
  }, [accessCode])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    const onFocus = () => loadData()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadData])

  // Unlock timers
  useEffect(() => {
    unlockTimersRef.current.forEach(clearTimeout)
    unlockTimersRef.current = []
    const now = Date.now()

    missions.forEach((pm) => {
      if (!pm.unlock_time) return
      const unlockAt = new Date(pm.unlock_time).getTime()
      const delay = unlockAt - now
      if (delay > 0) {
        const timer = setTimeout(() => {
          setToast('A new mission has unlocked!')
          loadData()
          setTimeout(() => setToast(''), 4000)
        }, delay)
        unlockTimersRef.current.push(timer)
      }
    })

    const unlockedIds = new Set(
      missions
        .filter((pm) => !pm.unlock_time || new Date(pm.unlock_time) <= new Date())
        .map((pm) => pm.id)
    )
    prevUnlockedRef.current = unlockedIds

    return () => {
      unlockTimersRef.current.forEach(clearTimeout)
      unlockTimersRef.current = []
    }
  }, [missions, loadData])

  async function handleMissionSave(id, completed, notes, photoUrl) {
    const prev = missions.find(m => m.id === id)
    const justCompleted = completed && !prev?.completed

    await supabase
      .from('participant_missions')
      .update({
        completed,
        notes: notes || null,
        photo_url: photoUrl || null,
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq('id', id)

    if (justCompleted) {
      fireConfetti()
      setToast('Mission complete!')
      setTimeout(() => setToast(''), 3000)
    }

    loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="pq-spinner" />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.9rem' }}>
            Loading your missions...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: 'var(--radius-full)',
              backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem',
            }}
          >!</div>
          <p style={{ color: 'var(--color-danger)', fontWeight: 500 }}>{error}</p>
          <button onClick={() => navigate('/join')} className="pq-btn pq-btn-ghost">
            Go back
          </button>
        </div>
      </div>
    )
  }

  const now = new Date()
  const completedCount = missions.filter(m => m.completed).length
  const totalCount = missions.length

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)', paddingBottom: '5rem' }}>
      <div style={{ maxWidth: '28rem', margin: '0 auto', padding: '0 1rem' }}>
        {/* Header */}
        <div
          className="animate-fade-in"
          style={{ padding: '1.25rem 0 1rem', borderBottom: '1px solid var(--color-border-light)', marginBottom: '1.25rem' }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', fontFamily: 'var(--font-body)', marginBottom: '2px' }}>
                {event?.name}
              </p>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', color: 'var(--color-text)', margin: 0 }}>
                Hey, {participant?.name}
              </h1>
            </div>
            <button
              onClick={() => navigate('/')}
              className="pq-btn pq-btn-ghost"
              style={{ padding: '6px 12px', fontSize: '0.8rem', minHeight: 'auto' }}
            >
              Exit
            </button>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div style={{ marginTop: '0.75rem' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                  {completedCount} of {totalCount} missions complete
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'var(--font-heading)' }}>
                  {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                </span>
              </div>
              <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'var(--color-border-light)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                    borderRadius: '3px',
                    background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Welcome card */}
        {showWelcome && tab === 'missions' && (
          <div
            className="pq-card animate-scale-in"
            style={{
              backgroundColor: 'var(--color-primary-light)',
              borderColor: 'var(--color-primary-subtle)',
              marginBottom: '1rem',
              position: 'relative',
            }}
          >
            <button
              onClick={() => {
                setShowWelcome(false)
                localStorage.setItem('pq_player_welcome_dismissed', '1')
              }}
              style={{
                position: 'absolute', top: '8px', right: '12px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', fontSize: '1.1rem', lineHeight: 1,
              }}
            >
              &times;
            </button>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)', marginBottom: '0.5rem' }}>
              How to play
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              <p style={{ margin: 0 }}>Your secret missions are below — only you can see them.</p>
              <p style={{ margin: 0 }}>Tap a mission to mark it complete, add notes, or snap a photo.</p>
              <p style={{ margin: 0 }}>Check the Leaderboard and Feed tabs to see how everyone's doing.</p>
            </div>
          </div>
        )}

        {/* Tab content */}
        {tab === 'missions' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)', margin: 0 }}>
              Your Missions
            </h2>
            {missions.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                No missions assigned yet. Check back soon!
              </p>
            )}
            {missions.map((pm) => {
              const isLocked = pm.unlock_time && new Date(pm.unlock_time) > now
              if (isLocked) {
                return <LockedMission key={pm.id} unlockTime={pm.unlock_time} />
              }
              return (
                <MissionCard
                  key={pm.id}
                  mission={pm}
                  onSave={handleMissionSave}
                />
              )
            })}
          </div>
        )}

        {tab === 'leaderboard' && event && (
          <div className="animate-fade-in">
            <Leaderboard eventId={event.id} anonymity={event.anonymity_enabled} />
          </div>
        )}

        {tab === 'feed' && event && (
          <div className="animate-fade-in">
            <ActivityFeed
              eventId={event.id}
              feedMode={event.feed_mode || 'secret'}
              showPhotos={event.feed_photos_enabled !== false}
              showComments={event.feed_comments_enabled !== false}
              showReactions={event.feed_reactions_enabled !== false}
              showInteractiveComments={event.feed_interactive_comments_enabled === true}
              participantId={participant?.id}
            />
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="pq-toast">
          <div className="pq-toast-inner">
            {toast}
            <button
              onClick={() => setToast('')}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', marginLeft: '4px', fontSize: '1rem' }}
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Feedback button */}
      <FeedbackButton eventId={event?.id} participantId={participant?.id} />

      {/* Bottom tab bar */}
      <div className="pq-tab-bar">
        <div style={{ maxWidth: '28rem', margin: '0 auto', display: 'flex', width: '100%' }}>
          {['missions', 'leaderboard', 'feed'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="pq-tab-item"
              data-active={tab === t}
            >
              {TAB_ICONS[t]}
              <span>{t === 'missions' ? 'Missions' : t === 'leaderboard' ? 'Leaderboard' : 'Feed'}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
