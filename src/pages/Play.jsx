import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import MissionCard from '../components/MissionCard.jsx'
import LockedMission from '../components/LockedMission.jsx'
import Leaderboard from '../components/Leaderboard.jsx'
import CompletionModal from '../components/CompletionModal.jsx'
import FeedbackButton from '../components/FeedbackButton.jsx'

export default function Play() {
  const { accessCode } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState('missions')
  const [participant, setParticipant] = useState(null)
  const [event, setEvent] = useState(null)
  const [missions, setMissions] = useState([])
  const [selectedMission, setSelectedMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const unlockTimersRef = useRef([])
  const prevUnlockedRef = useRef(new Set())

  const loadData = useCallback(async () => {
    // Get participant
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

    // Get event
    const { data: evt } = await supabase
      .from('events')
      .select('id, name, status, anonymity_enabled')
      .eq('id', part.event_id)
      .single()

    setEvent(evt)

    // Get assigned missions with mission text
    const { data: pm } = await supabase
      .from('participant_missions')
      .select('id, completed, notes, photo_url, completed_at, unlock_time, mission_id, missions(text, category_id, categories(name))')
      .eq('participant_id', part.id)
      .order('unlock_time', { ascending: true, nullsFirst: true })

    setMissions(pm || [])
    setLoading(false)
  }, [accessCode])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Refresh on focus
  useEffect(() => {
    const onFocus = () => loadData()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadData])

  // Set up unlock timers for timed missions
  useEffect(() => {
    // Clear old timers
    unlockTimersRef.current.forEach(clearTimeout)
    unlockTimersRef.current = []

    const now = Date.now()

    missions.forEach((pm) => {
      if (!pm.unlock_time) return
      const unlockAt = new Date(pm.unlock_time).getTime()
      const delay = unlockAt - now

      // If it unlocks in the future, set a timer
      if (delay > 0) {
        const timer = setTimeout(() => {
          setToast('A new mission has unlocked!')
          // Reload to update mission states
          loadData()
          // Auto-dismiss toast after 4 seconds
          setTimeout(() => setToast(''), 4000)
        }, delay)
        unlockTimersRef.current.push(timer)
      }
    })

    // Track currently unlocked missions (for detecting new unlocks from realtime)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <p className="text-stone-500">Loading your missions...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => navigate('/join')}
            className="text-emerald-700 font-medium hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    )
  }

  const now = new Date()

  return (
    <div className="min-h-screen bg-stone-100 pb-20">
      <div className="max-w-md mx-auto px-4 pt-6 pb-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-stone-400 text-sm">{event?.name}</p>
              <h1 className="text-2xl font-bold text-stone-800">
                Welcome, {participant?.name}
              </h1>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-stone-400 text-sm hover:text-stone-600 transition-colors mt-1"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Tab content */}
        {tab === 'missions' && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-stone-700">Your Missions</h2>
            {missions.length === 0 && (
              <p className="text-stone-500 text-sm">No missions assigned yet.</p>
            )}
            {missions.map((pm) => {
              const isLocked = pm.unlock_time && new Date(pm.unlock_time) > now
              if (isLocked) {
                return (
                  <LockedMission
                    key={pm.id}
                    unlockTime={pm.unlock_time}
                  />
                )
              }
              return (
                <MissionCard
                  key={pm.id}
                  mission={pm}
                  onTap={() => setSelectedMission(pm)}
                />
              )
            })}
          </div>
        )}

        {tab === 'leaderboard' && event && (
          <Leaderboard eventId={event.id} anonymity={event.anonymity_enabled} />
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-2">
            <span>&#x1F389;</span>
            {toast}
            <button
              onClick={() => setToast('')}
              className="ml-2 text-emerald-200 hover:text-white"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Completion modal */}
      {selectedMission && (
        <CompletionModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onSave={async (id, completed, notes, photoUrl) => {
            await supabase
              .from('participant_missions')
              .update({
                completed,
                notes: notes || null,
                photo_url: photoUrl || null,
                completed_at: completed ? new Date().toISOString() : null,
              })
              .eq('id', id)

            setSelectedMission(null)
            loadData()
          }}
        />
      )}

      {/* Feedback button */}
      <FeedbackButton eventId={event?.id} participantId={participant?.id} />

      {/* Tab bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200">
        <div className="max-w-md mx-auto flex">
          <button
            onClick={() => setTab('missions')}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${
              tab === 'missions'
                ? 'text-emerald-700 border-t-2 border-emerald-700'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            Missions
          </button>
          <button
            onClick={() => setTab('leaderboard')}
            className={`flex-1 py-3 text-center font-medium text-sm transition-colors ${
              tab === 'leaderboard'
                ? 'text-emerald-700 border-t-2 border-emerald-700'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            Leaderboard
          </button>
        </div>
      </div>
    </div>
  )
}
