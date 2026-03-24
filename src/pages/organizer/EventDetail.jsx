import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.js'
import Leaderboard from '../../components/Leaderboard.jsx'
import ActivityFeed from '../../components/ActivityFeed.jsx'

export default function EventDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, loading: authLoading, signInWithGoogle } = useAuth()

  const [event, setEvent] = useState(null)
  const [config, setConfig] = useState(null)
  const [participants, setParticipants] = useState([])
  const [missionAssignments, setMissionAssignments] = useState([])
  const [mostCompletedMission, setMostCompletedMission] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ending, setEnding] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [activeTab, setActiveTab] = useState('participants')
  const [selectTarget, setSelectTarget] = useState(null)
  const [localAssignments, setLocalAssignments] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [missionPool, setMissionPool] = useState([])
  const [organizerAccessCode, setOrganizerAccessCode] = useState(null)
  const [showQR, setShowQR] = useState(false)
  // Add participant inline
  const [addingParticipant, setAddingParticipant] = useState(false)
  const [newParticipantName, setNewParticipantName] = useState('')
  // Copy toast
  const [copyToast, setCopyToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')

  function copyWithToast(text, label, key) {
    navigator.clipboard?.writeText(text)
    setCopyToast(label || 'Copied!')
    setTimeout(() => setCopyToast(''), 2000)
    if (key) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 2000)
    }
  }

  const loadData = useCallback(async () => {
    // Get event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (eventError || !eventData) {
      setError('Event not found.')
      setLoading(false)
      return
    }

    setEvent(eventData)

    // Get config
    const { data: configData } = await supabase
      .from('event_config')
      .select('*')
      .eq('event_id', id)
      .single()

    setConfig(configData)

    // Get participants with their mission completion counts
    const { data: participantData } = await supabase
      .from('participants')
      .select('id, name, access_code, joined_at, is_active, source')
      .eq('event_id', id)
      .order('name')

    if (participantData) {
      // Get completion counts for each participant
      const withCounts = await Promise.all(
        participantData.map(async (p) => {
          const { data: missions } = await supabase
            .from('participant_missions')
            .select('id, completed')
            .eq('participant_id', p.id)

          const total = missions?.length || 0
          const completed = missions?.filter((m) => m.completed).length || 0
          return { ...p, total, completed }
        })
      )
      setParticipants(withCounts)

      // Check if organizer is also a participant
      if (user) {
        const orgParticipant = participantData.find(
          (p) => p.name === user.email || p.access_code
        )
        // Check by looking at event organizer's participant record
        const { data: orgPart } = await supabase
          .from('participants')
          .select('access_code')
          .eq('event_id', id)
          .eq('name', user.email)
          .maybeSingle()
        if (orgPart) {
          setOrganizerAccessCode(orgPart.access_code)
        }
      }

      // Find most completed mission (for post-event stats)
      if (participantData.length > 0) {
        const allPIds = participantData.map((p) => p.id)
        const { data: allCompletions } = await supabase
          .from('participant_missions')
          .select('mission_id, completed, missions(text)')
          .eq('completed', true)
          .in('participant_id', allPIds)

        if (allCompletions && allCompletions.length > 0) {
          const counts = {}
          allCompletions.forEach((c) => {
            if (!counts[c.mission_id]) {
              counts[c.mission_id] = { text: c.missions?.text, count: 0 }
            }
            counts[c.mission_id].count++
          })
          const top = Object.values(counts).sort((a, b) => b.count - a.count)[0]
          setMostCompletedMission(top)
        }
      }
    }

    setLoading(false)
  }, [id, user])

  // Load mission assignments for the Missions tab
  const loadMissionAssignments = useCallback(async () => {
    const { data: parts } = await supabase
      .from('participants')
      .select('id, name')
      .eq('event_id', id)
      .eq('is_active', true)
      .order('name')

    if (!parts || parts.length === 0) {
      setMissionAssignments([])
      return
    }

    const assignments = await Promise.all(
      parts.map(async (p) => {
        const { data: pm } = await supabase
          .from('participant_missions')
          .select('id, completed, completed_at, mission_id, missions(text)')
          .eq('participant_id', p.id)
        return { ...p, missions: pm || [] }
      })
    )

    setMissionAssignments(assignments)
  }, [id])

  // Load all missions in the pool (for sidebar)
  const loadMissionPool = useCallback(async () => {
    let query = supabase.from('missions').select('id, text').eq('active', true)
    if (config?.tag_filters?.length > 0) {
      query = query.in('category_id', config.tag_filters)
    }
    const { data } = await query
    setMissionPool(data || [])
  }, [config])

  // Sync local assignments from DB when not editing
  useEffect(() => {
    if (missionAssignments.length > 0 && !hasUnsavedChanges) {
      setLocalAssignments(missionAssignments.map(p => ({
        ...p,
        missions: p.missions.map(pm => ({ ...pm, _originalMissionId: pm.mission_id }))
      })))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionAssignments])

  useEffect(() => {
    if (!authLoading && !user) {
      signInWithGoogle()
      return
    }
    if (user) {
      loadData()
    }
  }, [user, authLoading, loadData])

  // Load mission assignments and pool when tab switches
  useEffect(() => {
    if (activeTab === 'missions' && user) {
      loadMissionAssignments()
      loadMissionPool()
    }
  }, [activeTab, user, loadMissionAssignments, loadMissionPool])

  // Refresh every 30 seconds for live events
  useEffect(() => {
    if (!event || event.status === 'ended') return
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [event?.status, loadData])

  // Update time remaining
  useEffect(() => {
    if (!event || event.status === 'ended') return

    function updateTime() {
      const now = new Date()
      const end = new Date(event.end_time)
      const diff = end - now

      if (diff <= 0) {
        setTimeRemaining('Event time has passed')
        return
      }

      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`)
      } else {
        setTimeRemaining(`${minutes}m remaining`)
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [event])

  async function handleEndEvent() {
    if (!confirm('Are you sure you want to end this event?')) return

    setEnding(true)
    const { error: updateError } = await supabase
      .from('events')
      .update({ status: 'ended' })
      .eq('id', id)

    if (updateError) {
      setError('Failed to end event.')
    } else {
      await loadData()
    }
    setEnding(false)
  }

  async function handleDeleteEvent() {
    const eventName = event.name
    if (
      !confirm(
        `Delete "${eventName}"? This will permanently remove the event, all participants, and mission data. This cannot be undone.`
      )
    )
      return

    setDeleting(true)
    setError('')

    try {
      // Cascade is handled by foreign keys (ON DELETE CASCADE)
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      navigate('/organizer')
    } catch (err) {
      setError(err.message || 'Failed to delete event.')
      setDeleting(false)
    }
  }

  async function handleClone() {
    setCloning(true)
    setError('')

    try {
      const now = new Date()
      now.setHours(19, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 0, 0, 0)

      const code = generateCode(6)

      const { data: newEvent, error: eventErr } = await supabase
        .from('events')
        .insert({
          organizer_id: user.id,
          name: `${event.name} (Copy)`,
          event_type: event.event_type,
          start_time: now.toISOString(),
          end_time: end.toISOString(),
          event_code: code,
          anonymity_enabled: event.anonymity_enabled,
          feed_mode: event.feed_mode,
          status: 'upcoming',
        })
        .select()
        .single()

      if (eventErr) throw eventErr

      if (config) {
        await supabase.from('event_config').insert({
          event_id: newEvent.id,
          mission_count: config.mission_count,
          unlock_type: config.unlock_type,
          unlock_schedule: config.unlock_schedule,
          tag_filters: config.tag_filters,
        })
      }

      if (participants.length > 0) {
        const participantRows = participants
          .filter((p) => p.is_active !== false)
          .map((p) => ({
            event_id: newEvent.id,
            name: p.name,
            access_code: generateCode(6),
          }))
        await supabase.from('participants').insert(participantRows)
      }

      navigate(`/organizer/event/${newEvent.id}`)
    } catch (err) {
      setError(err.message || 'Failed to clone event.')
    }

    setCloning(false)
  }

  async function handleAddParticipant() {
    if (!newParticipantName.trim()) return
    setAddingParticipant(true)
    setError('')

    try {
      const accessCode = generateCode(6)
      const { data: newPart, error: partErr } = await supabase
        .from('participants')
        .insert({
          event_id: id,
          name: newParticipantName.trim(),
          access_code: accessCode,
          source: 'manual',
        })
        .select()
        .single()

      if (partErr) throw partErr

      // If event is active, assign missions immediately
      if (event.status === 'active' && config) {
        await assignMissionsToParticipant(newPart, config)
      }

      setNewParticipantName('')
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to add participant.')
    }
    setAddingParticipant(false)
  }

  async function handleDeactivateParticipant(participantId) {
    if (!confirm('Remove this participant? They will be hidden but their data is retained.')) return

    await supabase
      .from('participants')
      .update({ is_active: false })
      .eq('id', participantId)

    await loadData()
  }

  function handleSelectForSwap(participantIdx, missionIdx) {
    if (selectTarget?.participantIdx === participantIdx && selectTarget?.missionIdx === missionIdx) {
      setSelectTarget(null)
      return
    }
    setSelectTarget({ participantIdx, missionIdx })
  }

  function ensureLocalAssignments() {
    return localAssignments || missionAssignments.map(p => ({
      ...p,
      missions: p.missions.map(pm => ({ ...pm, _originalMissionId: pm.mission_id }))
    }))
  }

  function handleUnassign(participantIdx, missionIdx) {
    setSelectTarget(null)
    const base = ensureLocalAssignments()
    const next = base.map((p, pIdx) => {
      if (pIdx !== participantIdx) return p
      return {
        ...p,
        missions: p.missions.map((pm, mIdx) => {
          if (mIdx !== missionIdx) return pm
          return { ...pm, mission_id: null, missions: null }
        })
      }
    })
    setLocalAssignments(next)
    setHasUnsavedChanges(true)
  }

  function handlePoolMissionClick(mission) {
    if (!selectTarget) return
    const { participantIdx, missionIdx } = selectTarget
    const base = ensureLocalAssignments()
    const next = base.map((p, pIdx) => {
      if (pIdx !== participantIdx) return p
      return {
        ...p,
        missions: p.missions.map((pm, mIdx) => {
          if (mIdx !== missionIdx) return pm
          return { ...pm, mission_id: mission.id, missions: { text: mission.text } }
        })
      }
    })
    setLocalAssignments(next)
    setSelectTarget(null)
    setHasUnsavedChanges(true)
  }

  function handleCancelEdits() {
    setLocalAssignments(missionAssignments.map(p => ({
      ...p,
      missions: p.missions.map(pm => ({ ...pm, _originalMissionId: pm.mission_id }))
    })))
    setHasUnsavedChanges(false)
    setSelectTarget(null)
  }

  async function handleSaveAssignments() {
    // Validate no empty slots
    const empty = localAssignments?.reduce((count, p) =>
      count + p.missions.filter(pm => !pm?.mission_id).length, 0
    ) ?? 0
    if (empty > 0 || !hasUnsavedChanges) return

    setSaving(true)
    setError('')
    try {
      const promises = []
      localAssignments.forEach(p => {
        p.missions.forEach(pm => {
          if (pm.mission_id && pm.mission_id !== pm._originalMissionId) {
            promises.push(
              supabase.from('participant_missions')
                .update({
                  mission_id: pm.mission_id,
                  completed: false,
                  notes: null,
                  photo_url: null,
                  completed_at: null
                })
                .eq('id', pm.id)
            )
          }
        })
      })

      await Promise.all(promises)
      await loadMissionAssignments()
      setHasUnsavedChanges(false)
      setSelectTarget(null)
    } catch (err) {
      setError(err.message || 'Failed to save assignments.')
    }
    setSaving(false)
  }

  async function assignMissionsToParticipant(participant, eventConfig) {
    let query = supabase
      .from('missions')
      .select('id')
      .eq('active', true)

    if (eventConfig.tag_filters?.length > 0) {
      query = query.in('category_id', eventConfig.tag_filters)
    }

    const { data: missions } = await query
    if (!missions || missions.length === 0) return

    const shuffled = [...missions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, eventConfig.mission_count)

    const rows = selected.map((m) => ({
      participant_id: participant.id,
      mission_id: m.id,
    }))

    if (rows.length > 0) {
      await supabase.from('participant_missions').insert(rows)
    }
  }

  // Compute mission pool with assignment counts from local state
  // NOTE: Must be above early returns to preserve hook call order
  const poolWithCounts = useMemo(() => {
    if (!missionPool.length) return []
    const counts = {}
    const working = localAssignments || missionAssignments
    working.forEach(p => {
      p.missions?.forEach(pm => {
        if (pm?.mission_id) {
          counts[pm.mission_id] = (counts[pm.mission_id] || 0) + 1
        }
      })
    })
    return missionPool.map(m => ({
      ...m,
      assignCount: counts[m.id] || 0
    })).sort((a, b) => a.text.localeCompare(b.text))
  }, [missionPool, localAssignments, missionAssignments])

  const emptySlots = localAssignments?.reduce((count, p) =>
    count + p.missions.filter(pm => !pm?.mission_id).length, 0
  ) ?? 0

  const canSave = hasUnsavedChanges && emptySlots === 0

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
            onClick={() => navigate('/organizer')}
            className="text-emerald-700 font-medium hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  const isEnded = event.status === 'ended'
  const isLive = event.status === 'active'
  const isUpcoming = event.status === 'upcoming'
  const activeParticipants = participants.filter((p) => p.is_active !== false)
  const joinedCount = activeParticipants.filter((p) => p.joined_at).length
  const totalCompletions = activeParticipants.reduce((s, p) => s + p.completed, 0)
  const participationRate =
    activeParticipants.length > 0
      ? Math.round(
          (activeParticipants.filter((p) => p.joined_at && p.completed > 0).length /
            activeParticipants.length) *
            100
        )
      : 0
  const avgCompletions =
    activeParticipants.length > 0
      ? (totalCompletions / activeParticipants.length).toFixed(1)
      : '0'

  const inviteLink = `${window.location.origin}/register/${event.event_code}`

  return (
    <div className="min-h-screen bg-stone-100">
      <div className={`${activeTab === 'missions' ? 'max-w-5xl' : 'max-w-2xl'} mx-auto px-4 py-6 transition-all`}>
        {/* Header */}
        <button
          onClick={() => navigate('/organizer')}
          className="text-stone-400 text-sm hover:text-stone-600 transition-colors mb-4"
        >
          &larr; Dashboard
        </button>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{event.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              {isLive && (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              )}
              {isUpcoming && (
                <span className="text-amber-600 text-sm font-medium">
                  Upcoming
                </span>
              )}
              {isEnded && (
                <span className="text-stone-400 text-sm font-medium">
                  Ended &middot;{' '}
                  {new Date(event.start_time).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
              {!isEnded && (
                <span className="text-stone-400 text-sm">
                  {timeRemaining}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEnded && (
              <button
                onClick={() => navigate(`/organizer/new?edit=${id}`)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Edit
              </button>
            )}
            {!isEnded && (
              <button
                onClick={handleEndEvent}
                disabled={ending}
                className="px-4 py-2 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {ending ? 'Ending...' : 'End Event'}
              </button>
            )}
          </div>
        </div>

        {/* Helper note */}
        {!isEnded && (
          <p className="text-stone-400 text-xs mb-4">
            You can edit this event at any time before it goes live.
          </p>
        )}

        {/* Event code + Invite link */}
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-emerald-600 text-xs font-medium">Event Code</p>
              <p className="text-xl font-mono font-bold text-emerald-700 tracking-widest">
                {event.event_code}
              </p>
            </div>
            <button
              onClick={() => copyWithToast(event.event_code, 'Event code copied!', 'eventCode')}
              className="text-emerald-700 text-sm font-medium hover:underline"
            >
              {copiedKey === 'eventCode' ? '\u2713 Copied!' : 'Copy'}
            </button>
          </div>

          {/* Invite link section */}
          {!isEnded && (
            <div className="border-t border-emerald-200 pt-3">
              <p className="text-emerald-600 text-xs font-medium mb-1">Invite Link</p>
              <div className="flex items-center gap-2">
                <p className="text-emerald-700 text-sm font-mono truncate flex-1">
                  {inviteLink}
                </p>
                <button
                  onClick={() => copyWithToast(inviteLink, 'Invite link copied!', 'inviteLink')}
                  className="text-emerald-700 text-xs font-medium hover:underline shrink-0"
                >
                  {copiedKey === 'inviteLink' ? '\u2713 Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="text-emerald-700 text-xs font-medium hover:underline shrink-0"
                >
                  {showQR ? 'Hide QR' : 'QR Code'}
                </button>
              </div>
              {showQR && (
                <div className="mt-3 p-4 bg-white rounded-lg text-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`}
                    alt="QR Code"
                    className="mx-auto"
                    width={200}
                    height={200}
                  />
                  <p className="text-stone-400 text-xs mt-2">Scan to register</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Play as Participant button */}
        {organizerAccessCode && (
          <button
            onClick={() => navigate(`/play/${organizerAccessCode}`)}
            className="w-full py-2 rounded-xl border border-emerald-300 text-emerald-700 text-sm font-medium hover:bg-emerald-50 transition-colors mb-6"
          >
            Play as Participant
          </button>
        )}

        {/* Post-event summary */}
        {isEnded && (
          <div className="rounded-xl bg-white border border-stone-200 p-4 mb-6">
            <h3 className="font-semibold text-stone-800 mb-3">Event Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-400">Total completions</p>
                <p className="text-stone-800 font-semibold text-lg">
                  {totalCompletions}
                </p>
              </div>
              <div>
                <p className="text-stone-400">Avg per person</p>
                <p className="text-stone-800 font-semibold text-lg">
                  {avgCompletions}
                </p>
              </div>
              <div>
                <p className="text-stone-400">Participation rate</p>
                <p className="text-stone-800 font-semibold text-lg">
                  {participationRate}%
                </p>
              </div>
              <div>
                <p className="text-stone-400">Participants joined</p>
                <p className="text-stone-800 font-semibold text-lg">
                  {joinedCount} / {activeParticipants.length}
                </p>
              </div>
            </div>
            {mostCompletedMission && (
              <div className="mt-4 pt-3 border-t border-stone-100">
                <p className="text-stone-400 text-sm">Most completed mission</p>
                <p className="text-stone-700 text-sm mt-0.5">
                  "{mostCompletedMission.text}" ({mostCompletedMission.count} completions)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard toggle */}
        {(isEnded || isLive) && (
          <div className="mb-6">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="text-emerald-700 text-sm font-medium hover:underline mb-3"
            >
              {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
            </button>
            {showLeaderboard && (
              <div className="rounded-xl bg-white border border-stone-200 p-4">
                <Leaderboard eventId={event.id} anonymity={event.anonymity_enabled} />
              </div>
            )}
          </div>
        )}

        {/* Tabs: Participants | Missions | Feed */}
        <div className="flex border-b border-stone-200 mb-4">
          {['participants', 'missions', 'feed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-center text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'text-emerald-700 border-b-2 border-emerald-700'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              {tab === 'participants' ? 'Participants' : tab === 'missions' ? 'Missions' : 'Feed'}
            </button>
          ))}
        </div>

        {/* Participants tab */}
        {activeTab === 'participants' && (
          <div className="rounded-xl bg-white border border-stone-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800">
                Participants ({activeParticipants.length})
              </h3>
              {activeParticipants.length > 0 && (
                <button
                  onClick={() => {
                    const codes = activeParticipants
                      .map((p) => `${p.name}: ${p.access_code}`)
                      .join('\n')
                    copyWithToast(
                      `Event: ${event.name}\nEvent Code: ${event.event_code}\n\nAccess Codes:\n${codes}`,
                      'All codes copied!'
                    )
                  }}
                  className="text-emerald-700 text-xs font-medium hover:underline"
                >
                  Copy All
                </button>
              )}
            </div>

            {activeParticipants.length === 0 ? (
              <p className="text-stone-400 text-sm px-4 py-6 text-center">
                No participants yet.
              </p>
            ) : (
              <div className="divide-y divide-stone-100">
                {/* Table header */}
                <div className="grid grid-cols-12 px-4 py-2 text-xs text-stone-400 font-medium uppercase tracking-wider">
                  <div className="col-span-3">Name</div>
                  <div className="col-span-3">Access Code</div>
                  <div className="col-span-1 text-center">Src</div>
                  <div className="col-span-2 text-center">Joined</div>
                  <div className="col-span-2 text-right">Done</div>
                  <div className="col-span-1"></div>
                </div>

                {activeParticipants.map((p) => (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 px-4 py-3 items-center text-sm"
                  >
                    <div className="col-span-3 text-stone-800 truncate">
                      {p.name}
                    </div>
                    <div className="col-span-3 font-mono text-stone-500 text-xs tracking-wide">
                      {p.access_code}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`text-xs ${p.source === 'self' ? 'text-blue-500' : 'text-stone-300'}`}>
                        {p.source === 'self' ? 'link' : 'add'}
                      </span>
                    </div>
                    <div className="col-span-2 text-center">
                      {p.joined_at ? (
                        <span className="text-emerald-600 font-medium">Yes</span>
                      ) : (
                        <span className="text-stone-300">&mdash;</span>
                      )}
                    </div>
                    <div className="col-span-2 text-right text-stone-600">
                      {p.completed} / {p.total}
                    </div>
                    <div className="col-span-1 text-right">
                      {!isEnded && (
                        <button
                          onClick={() => handleDeactivateParticipant(p.id)}
                          className="text-stone-300 hover:text-red-500 text-xs"
                          title="Remove participant"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add participant inline */}
            {!isEnded && (
              <div className="px-4 py-3 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    placeholder="Add participant name..."
                    className="flex-1 px-3 py-2 rounded-lg border border-stone-300 bg-white text-stone-800 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddParticipant()
                    }}
                  />
                  <button
                    onClick={handleAddParticipant}
                    disabled={addingParticipant || !newParticipantName.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50"
                  >
                    {addingParticipant ? '...' : 'Add'}
                  </button>
                </div>
                <p className="text-stone-400 text-xs mt-2">
                  Or share the <button onClick={() => { setActiveTab('participants'); copyWithToast(inviteLink, 'Invite link copied!', 'inviteLinkInline') }} className="text-emerald-700 font-medium hover:underline">{copiedKey === 'inviteLinkInline' ? '\u2713 Copied!' : 'invite link'}</button> and let participants register themselves.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Missions tab — Assignment View with Pool Sidebar */}
        {activeTab === 'missions' && (
          <div className="mb-6">
            {/* Save bar */}
            {hasUnsavedChanges && !isEnded && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-amber-800 text-sm font-medium">Unsaved changes</span>
                  {emptySlots > 0 && (
                    <span className="text-amber-600 text-xs ml-2">
                      ({emptySlots} empty {emptySlots === 1 ? 'slot' : 'slots'} — fill before saving)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdits}
                    className="px-3 py-1.5 rounded-lg text-stone-600 text-sm font-medium hover:bg-stone-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignments}
                    disabled={!canSave || saving}
                    className="px-4 py-1.5 rounded-lg bg-emerald-700 text-white text-sm font-medium hover:bg-emerald-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            )}

            {/* Select mode banner */}
            {selectTarget && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                <span className="text-blue-800 text-sm font-medium">
                  Select a mission from the pool to assign
                </span>
                <button
                  onClick={() => setSelectTarget(null)}
                  className="text-blue-600 text-sm font-medium hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-4">
              {/* Participant assignments */}
              <div className="flex-1 min-w-0 space-y-4">
                {(!isEnded && !isLive && (localAssignments || missionAssignments).length === 0) && (
                  <p className="text-stone-400 text-sm text-center py-6">
                    Mission assignments will appear here after the event is created.
                  </p>
                )}
                {(localAssignments || missionAssignments).map((participant, pIdx) => (
                  <div key={participant.id} className="rounded-xl bg-white border border-stone-200 overflow-hidden">
                    <div className="px-4 py-3 border-b border-stone-100">
                      <h4 className="font-semibold text-stone-800 text-sm">{participant.name}</h4>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {participant.missions.map((pm, mIdx) => (
                        <div
                          key={pm?.id || mIdx}
                          className={`px-4 py-2 flex items-center justify-between ${
                            selectTarget?.participantIdx === pIdx && selectTarget?.missionIdx === mIdx
                              ? 'bg-blue-50 border-l-2 border-blue-400'
                              : ''
                          }`}
                        >
                          {pm?.mission_id ? (
                            <>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm truncate ${pm.completed ? 'text-emerald-600 line-through' : 'text-stone-700'}`}>
                                  {pm.missions?.text || 'Unknown mission'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                {pm.completed && (
                                  <span className="text-emerald-500 text-xs font-medium">Done</span>
                                )}
                                {(isUpcoming || (isLive && !pm.completed)) && (
                                  <>
                                    <button
                                      onClick={() => handleSelectForSwap(pIdx, mIdx)}
                                      className={`text-xs font-medium ${
                                        selectTarget?.participantIdx === pIdx && selectTarget?.missionIdx === mIdx
                                          ? 'text-blue-700'
                                          : 'text-blue-600 hover:text-blue-700'
                                      }`}
                                    >
                                      {selectTarget?.participantIdx === pIdx && selectTarget?.missionIdx === mIdx
                                        ? 'Selecting...'
                                        : 'Swap'}
                                    </button>
                                    <button
                                      onClick={() => handleUnassign(pIdx, mIdx)}
                                      className="text-red-500 hover:text-red-600 text-xs font-medium"
                                    >
                                      Unassign
                                    </button>
                                  </>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="flex-1 flex items-center justify-between">
                              <span className="text-stone-400 text-sm italic">Empty slot</span>
                              {(isUpcoming || isLive) && (
                                <button
                                  onClick={() => handleSelectForSwap(pIdx, mIdx)}
                                  className={`text-xs font-medium ${
                                    selectTarget?.participantIdx === pIdx && selectTarget?.missionIdx === mIdx
                                      ? 'text-blue-700'
                                      : 'text-emerald-600 hover:text-emerald-700'
                                  }`}
                                >
                                  {selectTarget?.participantIdx === pIdx && selectTarget?.missionIdx === mIdx
                                    ? 'Selecting...'
                                    : 'Assign'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      {participant.missions.length === 0 && (
                        <p className="text-stone-400 text-xs px-4 py-3">No missions assigned</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mission Pool Sidebar */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="lg:sticky lg:top-4 rounded-xl bg-white border border-stone-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100">
                    <h3 className="font-semibold text-stone-800 text-sm">
                      Mission Pool ({poolWithCounts.length})
                    </h3>
                    <p className="text-stone-400 text-xs mt-0.5">
                      Number shows how many players have each mission
                    </p>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto divide-y divide-stone-50">
                    {poolWithCounts.map((mission) => (
                      <div
                        key={mission.id}
                        onClick={() => selectTarget && handlePoolMissionClick(mission)}
                        className={`px-4 py-2.5 flex items-start justify-between gap-2 ${
                          selectTarget
                            ? 'cursor-pointer hover:bg-emerald-50 transition-colors'
                            : ''
                        }`}
                      >
                        <p className="text-sm text-stone-700 flex-1">{mission.text}</p>
                        <span className={`text-xs font-mono font-medium shrink-0 px-1.5 py-0.5 rounded ${
                          mission.assignCount === 0
                            ? 'bg-stone-100 text-stone-400'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {mission.assignCount}
                        </span>
                      </div>
                    ))}
                    {poolWithCounts.length === 0 && (
                      <p className="text-stone-400 text-xs px-4 py-6 text-center">
                        No missions in pool
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feed tab */}
        {activeTab === 'feed' && event && (
          <div className="mb-6">
            <ActivityFeed eventId={event.id} feedMode={event.feed_mode || 'secret'} />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleClone}
            disabled={cloning}
            className="flex-1 py-3 rounded-xl bg-emerald-700 text-white font-semibold hover:bg-emerald-800 transition-colors text-sm disabled:opacity-50"
          >
            {cloning ? 'Cloning...' : 'Clone Event'}
          </button>
          <button
            onClick={handleDeleteEvent}
            disabled={deleting}
            className="py-3 px-6 rounded-xl border border-red-300 text-red-600 font-semibold hover:bg-red-50 transition-colors text-sm disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      </div>

      {/* Copy toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-down">
          <div className="bg-stone-800 text-white px-5 py-2.5 rounded-xl shadow-lg text-sm font-medium">
            {copyToast}
          </div>
        </div>
      )}
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
