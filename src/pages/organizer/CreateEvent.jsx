import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.js'

const EVENT_TYPES = [
  'Birthday',
  'House Party',
  'Bachelorette/Bachelor',
  'Work Offsite',
  'Weekend Trip',
  'Other',
]

const HOW_HEARD_OPTIONS = ['Friend', 'Social media', 'Search', 'Other']

export default function CreateEvent() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const { user, loading: authLoading, signInWithGoogle } = useAuth()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [launching, setLaunching] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editEventId, setEditEventId] = useState(editId || null)
  const [editEventStatus, setEditEventStatus] = useState(null)
  const textareaRef = useRef(null)

  // Step 1 — Event Basics
  const [eventName, setEventName] = useState('')
  const [eventType, setEventType] = useState('House Party')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [howHeard, setHowHeard] = useState('')
  const [emailOptIn, setEmailOptIn] = useState(false)
  const [organizerEmail, setOrganizerEmail] = useState('')

  // Step 2 — Participants
  const [participantCount, setParticipantCount] = useState(10)
  const [participantNames, setParticipantNames] = useState('')
  const [anonymityEnabled, setAnonymityEnabled] = useState(false)

  // Step 3 — Missions
  const [missionCount, setMissionCount] = useState(3)
  const [unlockType, setUnlockType] = useState('all_at_once')
  const [unlockTimes, setUnlockTimes] = useState(['', ''])
  const [categories, setCategories] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [availableMissionCount, setAvailableMissionCount] = useState(0)

  // Step 4 — Generated data
  const [eventCode, setEventCode] = useState('')
  const [generatedParticipants, setGeneratedParticipants] = useState([])
  const [launched, setLaunched] = useState(false)
  const [createdEventId, setCreatedEventId] = useState(null)
  // Copy toast
  const [copyToast, setCopyToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')

  // Set default times (today evening)
  useEffect(() => {
    if (!startTime) {
      const now = new Date()
      now.setHours(19, 0, 0, 0)
      setStartTime(formatDateTimeLocal(now))
      const end = new Date(now)
      end.setHours(23, 0, 0, 0)
      setEndTime(formatDateTimeLocal(end))
    }
  }, [])

  // Pre-fill organizer email from Google account
  useEffect(() => {
    if (user?.email && !organizerEmail) {
      setOrganizerEmail(user.email)
    }
  }, [user])

  // Load event data if editing
  useEffect(() => {
    if (!editId || !user) return
    async function loadEvent() {
      const { data } = await supabase
        .from('events')
        .select('*, event_config(*)')
        .eq('id', editId)
        .eq('organizer_id', user.id)
        .single()
      if (!data) return
      setIsEditMode(true)
      setEditEventId(data.id)
      setEditEventStatus(data.status)
      setEventName(data.name || '')
      setEventType(data.event_type ? data.event_type.charAt(0).toUpperCase() + data.event_type.slice(1) : 'House Party')
      if (data.start_time) setStartTime(formatDateTimeLocal(new Date(data.start_time)))
      if (data.end_time) setEndTime(formatDateTimeLocal(new Date(data.end_time)))
      setHowHeard(data.how_heard || '')
      setEmailOptIn(data.email_opt_in || false)
      setOrganizerEmail(data.organizer_email || user.email || '')
      setAnonymityEnabled(data.anonymity_enabled || false)
      if (data.event_config?.[0]) {
        const config = data.event_config[0]
        setMissionCount(config.mission_count || 3)
        setUnlockType(config.unlock_type || 'all_at_once')
        if (config.tag_filters) setSelectedTags(config.tag_filters)
      }
      // Load existing participant names
      const { data: parts } = await supabase
        .from('participants')
        .select('name')
        .eq('event_id', editId)
        .eq('is_active', true)
        .order('name')
      if (parts && parts.length > 0) {
        setParticipantCount(parts.length)
        setParticipantNames(parts.map(p => p.name).join('\n'))
      }
    }
    loadEvent()
  }, [editId, user])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.max(textareaRef.current.scrollHeight, 120) + 'px'
    }
  }, [participantNames, step])

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      if (data) {
        setCategories(data)
        // Default: all selected (use category IDs for reliable filtering)
        if (selectedTags.length === 0) {
          setSelectedTags(data.map((c) => c.id))
        }
      }
    }
    loadCategories()
  }, [])

  // Count available missions when selected categories change
  useEffect(() => {
    async function countMissions() {
      if (selectedTags.length === 0) {
        setAvailableMissionCount(0)
        return
      }

      const { count } = await supabase
        .from('missions')
        .select('id', { count: 'exact', head: true })
        .eq('active', true)
        .in('category_id', selectedTags)

      setAvailableMissionCount(count || 0)
    }
    countMissions()
  }, [selectedTags])

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      signInWithGoogle()
    }
  }, [user, authLoading])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-stone-500">Loading...</p>
        </div>
      </div>
    )
  }

  function validateStep(s) {
    if (s === 1) {
      if (!eventName.trim()) return 'Event name is required.'
      if (!startTime) return 'Start time is required.'
      if (!endTime) return 'End time is required.'
      if (new Date(endTime) <= new Date(startTime))
        return 'End time must be after start time.'
    }
    if (s === 2) {
      if (participantCount < 1) return 'At least 1 participant is required.'
    }
    if (s === 3) {
      if (selectedTags.length === 0)
        return 'Select at least one category.'
      if (unlockType === 'timed') {
        const validTimes = unlockTimes.filter((t) => t.trim() !== '')
        if (validTimes.length === 0)
          return 'Set at least one unlock time.'
      }
    }
    return ''
  }

  function nextStep() {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError('')
    if (step === 3) {
      prepareReview()
    }
    setStep(step + 1)
  }

  function prevStep() {
    setError('')
    setStep(step - 1)
  }

  function prepareReview() {
    // Generate event code
    const code = generateCode(6)
    setEventCode(code)

    // Parse names
    const names = participantNames
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean)

    // Fill remaining slots with unnamed participants
    const totalSlots = Math.max(participantCount, names.length)
    const participants = []
    for (let i = 0; i < totalSlots; i++) {
      participants.push({
        name: names[i] || `Participant ${i + 1}`,
        accessCode: generateCode(6),
        isNamed: !!names[i],
      })
    }
    setGeneratedParticipants(participants)
  }

  async function handleLaunch() {
    setError('')
    setLaunching(true)

    try {
      // Determine status based on start time
      const now = new Date()
      const start = new Date(startTime)
      const status = start <= now ? 'active' : 'upcoming'

      let eventData
      const eventPayload = {
        organizer_id: user.id,
        name: eventName.trim(),
        event_type: eventType.toLowerCase(),
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        event_code: eventCode,
        anonymity_enabled: anonymityEnabled,
        how_heard: howHeard || null,
        email_opt_in: emailOptIn,
        organizer_email: emailOptIn ? organizerEmail : null,
        status,
      }

      if (isEditMode && editEventId) {
        // Update existing event
        const { data, error: updateError } = await supabase
          .from('events')
          .update(eventPayload)
          .eq('id', editEventId)
          .select()
          .single()
        if (updateError) throw updateError
        eventData = data

        // Update event config
        const schedule =
          unlockType === 'timed'
            ? unlockTimes.filter((t) => t.trim()).map((t) => new Date(t).toISOString())
            : null

        await supabase
          .from('event_config')
          .update({
            mission_count: missionCount,
            unlock_type: unlockType,
            unlock_schedule: schedule,
            tag_filters: selectedTags,
          })
          .eq('event_id', editEventId)

        setCreatedEventId(eventData.id)
        setLaunched(true)
      } else {
        // Create new event
        const { data, error: insertError } = await supabase
          .from('events')
          .insert(eventPayload)
          .select()
          .single()
        if (insertError) throw insertError
        eventData = data

        // Insert event config
        const schedule =
          unlockType === 'timed'
            ? unlockTimes.filter((t) => t.trim()).map((t) => new Date(t).toISOString())
            : null

        const { error: configError } = await supabase
          .from('event_config')
          .insert({
            event_id: eventData.id,
            mission_count: missionCount,
            unlock_type: unlockType,
            unlock_schedule: schedule,
            tag_filters: selectedTags,
          })

        if (configError) throw configError

        // Insert participants
        const participantRows = generatedParticipants.map((p) => ({
          event_id: eventData.id,
          name: p.name,
          access_code: p.accessCode,
        }))

        const { data: insertedParticipants, error: partError } = await supabase
          .from('participants')
          .insert(participantRows)
          .select()

        if (partError) throw partError

        // Assign missions to each participant
        await assignMissionsToAll(insertedParticipants, eventData.id)

        setCreatedEventId(eventData.id)
        setLaunched(true)
      }
    } catch (err) {
      setError(err.message || 'Failed to create event. Please try again.')
    }

    setLaunching(false)
  }

  async function assignMissionsToAll(participants, eventId) {
    // Get eligible missions
    let query = supabase
      .from('missions')
      .select('id')
      .eq('active', true)

    if (selectedTags.length > 0) {
      query = query.in('category_id', selectedTags)
    }

    const { data: missions } = await query
    if (!missions || missions.length === 0) return

    // Shuffle missions
    const shuffled = [...missions].sort(() => Math.random() - 0.5)

    // Build unlock schedule
    const schedule =
      unlockType === 'timed'
        ? unlockTimes
            .filter((t) => t.trim())
            .map((t) => new Date(t).toISOString())
        : null

    // Track assignment counts for uniqueness
    const assignmentCounts = {}
    missions.forEach((m) => (assignmentCounts[m.id] = 0))

    const allRows = []

    for (const participant of participants) {
      // Sort by least assigned for uniqueness
      const sorted = [...shuffled].sort(
        (a, b) => (assignmentCounts[a.id] || 0) - (assignmentCounts[b.id] || 0)
      )

      const selected = sorted.slice(0, missionCount)

      selected.forEach((m, i) => {
        assignmentCounts[m.id] = (assignmentCounts[m.id] || 0) + 1
        allRows.push({
          participant_id: participant.id,
          mission_id: m.id,
          unlock_time:
            unlockType === 'timed' && schedule && schedule[i]
              ? schedule[i]
              : null,
        })
      })
    }

    if (allRows.length > 0) {
      await supabase.from('participant_missions').insert(allRows)
    }
  }

  function copyWithToast(text, label, key) {
    navigator.clipboard?.writeText(text)
    setCopyToast(label || 'Copied!')
    setTimeout(() => setCopyToast(''), 2000)
    if (key) {
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(''), 2000)
    }
  }

  function copyAllCodes() {
    const lines = generatedParticipants
      .map((p) => `${p.name}: ${p.accessCode}`)
      .join('\n')
    const text = `Event: ${eventName}\nEvent Code: ${eventCode}\n\nParticipant Access Codes:\n${lines}`
    copyWithToast(text, 'All codes copied!', 'allCodes')
  }

  const totalMissionsNeeded = participantCount * missionCount
  const poolTooSmall = availableMissionCount < totalMissionsNeeded

  return (
    <div className="min-h-screen bg-stone-100">
      <div className="max-w-md mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              if (launched) {
                navigate(`/organizer/event/${createdEventId}`)
              } else if (step === 1) {
                navigate('/organizer')
              } else {
                prevStep()
              }
            }}
            className="text-stone-400 text-sm hover:text-stone-600 transition-colors"
          >
            {launched ? 'View Event' : step === 1 ? '← Back' : '← Back'}
          </button>
          <span className="text-stone-400 text-sm">
            {!launched && `Step ${step} of 4`}
          </span>
        </div>

        {/* Progress bar */}
        {!launched && (
          <div className="flex gap-2 mb-8">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full ${
                  s <= step ? 'bg-emerald-700' : 'bg-stone-300'
                }`}
              />
            ))}
          </div>
        )}

        {/* Step 1 — Event Basics */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-stone-800">Event Basics</h2>
            <p className="text-stone-400 text-sm">Tell us about your event. The start and end times control when missions go live and when the event wraps up.</p>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                Event Name *
              </label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. Sarah's Birthday Bash"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                disabled={isEditMode && editEventStatus === 'active'}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:opacity-50"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {isEditMode && editEventStatus === 'active' && (
                <p className="text-stone-400 text-xs mt-1">Cannot change event type while active</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Start
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  End
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                How did you hear about Party Quest?
              </label>
              <select
                value={howHeard}
                onChange={(e) => setHowHeard(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
              >
                <option value="">-- Optional --</option>
                {HOW_HEARD_OPTIONS.map((o) => (
                  <option key={o} value={o.toLowerCase()}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailOptIn}
                  onChange={(e) => setEmailOptIn(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span className="text-sm text-stone-600">
                  Send me a post-event summary
                </span>
              </label>
              {emailOptIn && (
                <input
                  type="email"
                  value={organizerEmail}
                  onChange={(e) => setOrganizerEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Participants */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-stone-800">Participants</h2>
            <p className="text-stone-400 text-sm">You can add people now, share an invite link later, or both. Don't stress about getting everyone — you can always add more after the event is created.</p>

            {/* Invite link info */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
              <h4 className="text-emerald-800 text-sm font-semibold mb-1">Option A: Share an invite link</h4>
              <p className="text-emerald-700 text-xs">After creating the event, you'll get a shareable link and QR code. Send it out and guests register themselves — no names needed upfront.</p>
            </div>

            {/* Pre-register names */}
            <div className="rounded-xl bg-white border border-stone-200 p-4 space-y-3">
              <div>
                <h4 className="text-stone-700 text-sm font-semibold mb-1">Option B: Add names now</h4>
                <p className="text-stone-400 text-xs mb-2">If you already know who's coming, add their names and you'll get individual access codes to hand out.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Expected headcount
                </label>
                <input
                  type="number"
                  value={participantCount}
                  onChange={(e) =>
                    setParticipantCount(
                      Math.max(1, parseInt(e.target.value) || 1)
                    )
                  }
                  min={1}
                  max={200}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">
                  Names (optional)
                </label>
                <textarea
                  ref={textareaRef}
                  value={participantNames}
                  onChange={(e) => setParticipantNames(e.target.value)}
                  placeholder={"Jake\nSarah\nMike\nTaylor"}
                  rows={4}
                  style={{ minHeight: '120px', maxHeight: '400px', overflow: 'auto' }}
                  className="w-full px-4 py-3 rounded-xl border border-stone-300 bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent resize-none"
                />
                <p className="text-stone-400 text-xs mt-1">One per line. Any unnamed slots can be filled via invite link later.</p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={anonymityEnabled}
                onChange={(e) => setAnonymityEnabled(e.target.checked)}
                className="w-5 h-5 rounded border-stone-300 text-emerald-700 focus:ring-emerald-600"
              />
              <span className="text-sm text-stone-600">
                Hide participant names on leaderboard
              </span>
            </label>
          </div>
        )}

        {/* Step 3 — Missions */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-stone-800">Missions</h2>
            <p className="text-stone-400 text-sm">Choose how many missions each guest gets and how they unlock. Missions are pulled from our library based on the categories you pick.</p>

            {isEditMode && editEventStatus === 'active' && (
              <p className="text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3">
                Mission settings cannot be changed while the event is active.
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">
                Missions per participant: {missionCount}
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={missionCount}
                onChange={(e) => setMissionCount(parseInt(e.target.value))}
                disabled={isEditMode && editEventStatus === 'active'}
                className="w-full accent-emerald-700 disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-stone-400 mt-1">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">
                Unlock Type
              </label>
              <p className="text-stone-400 text-xs mb-2">All at once = guests see every mission from the start. Timed = missions reveal throughout the event to keep things exciting.</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setUnlockType('all_at_once')}
                  className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                    unlockType === 'all_at_once'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  All at Once
                </button>
                <button
                  type="button"
                  onClick={() => setUnlockType('timed')}
                  className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                    unlockType === 'timed'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  Timed Release
                </button>
              </div>
            </div>

            {unlockType === 'timed' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-stone-600">
                  Unlock Times
                </label>
                {unlockTimes.map((time, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-stone-400 text-sm w-16">
                      Slot {i + 1}
                    </span>
                    <input
                      type="datetime-local"
                      value={time}
                      onChange={(e) => {
                        const updated = [...unlockTimes]
                        updated[i] = e.target.value
                        setUnlockTimes(updated)
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent text-sm"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setUnlockTimes([...unlockTimes, ''])}
                  className="text-emerald-700 text-sm font-medium hover:underline"
                >
                  + Add unlock time
                </button>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-2">
                Categories
              </label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = selectedTags.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedTags((prev) =>
                          isSelected
                            ? prev.filter((t) => t !== cat.id)
                            : [...prev, cat.id]
                        )
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white border border-stone-300 text-stone-500 hover:bg-stone-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="rounded-xl bg-stone-200/50 p-4 text-sm text-stone-600">
              <p>
                {availableMissionCount} missions available for{' '}
                {participantCount} participants
              </p>
              {poolTooSmall && availableMissionCount > 0 && (
                <p className="text-amber-600 mt-1">
                  Some missions will be shared between participants.
                </p>
              )}
              {availableMissionCount === 0 && (
                <p className="text-red-600 mt-1">
                  No missions match your selected categories.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 4 — Review + Launch */}
        {step === 4 && !launched && (
          <div className="space-y-5">
            <h2 className="text-2xl font-bold text-stone-800">
              Review & Launch
            </h2>

            {/* Event Summary */}
            <div className="rounded-xl bg-white border border-stone-200 p-4 space-y-3">
              <h3 className="font-semibold text-stone-800">Event Summary</h3>
              <div className="space-y-1 text-sm text-stone-600">
                <p>
                  <span className="text-stone-400">Name:</span> {eventName}
                </p>
                <p>
                  <span className="text-stone-400">Type:</span> {eventType}
                </p>
                <p>
                  <span className="text-stone-400">Start:</span>{' '}
                  {new Date(startTime).toLocaleString()}
                </p>
                <p>
                  <span className="text-stone-400">End:</span>{' '}
                  {new Date(endTime).toLocaleString()}
                </p>
                <p>
                  <span className="text-stone-400">Participants:</span>{' '}
                  {generatedParticipants.length}
                </p>
                <p>
                  <span className="text-stone-400">Missions each:</span>{' '}
                  {missionCount}
                </p>
                <p>
                  <span className="text-stone-400">Unlock:</span>{' '}
                  {unlockType === 'all_at_once' ? 'All at once' : 'Timed release'}
                </p>
                {anonymityEnabled && (
                  <p className="text-amber-600">Anonymous leaderboard</p>
                )}
              </div>
            </div>

            {/* Event Code */}
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-emerald-600 text-sm font-medium mb-1">
                Event Code
              </p>
              <p className="text-3xl font-mono font-bold text-emerald-700 tracking-widest">
                {eventCode}
              </p>
              <p className="text-emerald-600 text-xs mt-1">
                Participants and spectators use this to join
              </p>
            </div>

            {/* Participant Codes */}
            <div className="rounded-xl bg-white border border-stone-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-stone-800">Access Codes</h3>
                <button
                  onClick={copyAllCodes}
                  className="text-emerald-700 text-sm font-medium hover:underline"
                >
                  {copiedKey === 'allCodes' ? '\u2713 Copied!' : 'Copy All'}
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {generatedParticipants.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm py-1"
                  >
                    <span className="text-stone-600 truncate mr-3">
                      {p.name}
                    </span>
                    <span className="font-mono text-stone-800 font-medium tracking-wide">
                      {p.accessCode}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Launched state */}
        {launched && (
          <div className="space-y-5">
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 space-y-3 text-center">
              <p className="text-4xl">🎉</p>
              <h2 className="text-2xl font-bold text-emerald-700">
                Event Created!
              </h2>
              <p className="text-emerald-600">
                {eventName} is ready to go.
              </p>
              <p className="text-3xl font-mono font-bold text-emerald-700 tracking-widest mt-2">
                {eventCode}
              </p>
            </div>

            {/* Next steps checklist */}
            <div className="rounded-xl bg-white border border-stone-200 p-5">
              <h3 className="font-semibold text-stone-800 mb-3">Next steps</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="text-emerald-600 mt-0.5">&#9745;</span>
                  <p className="text-stone-600"><span className="font-medium text-stone-800">Share the invite link</span> — from the event page, copy the link or QR code and send it to your guests</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-stone-300 mt-0.5">&#9744;</span>
                  <p className="text-stone-600"><span className="font-medium text-stone-800">Or hand out access codes</span> — if you added names, each person has a unique code on the event page</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-stone-300 mt-0.5">&#9744;</span>
                  <p className="text-stone-600"><span className="font-medium text-stone-800">Check the mission assignments</span> — use the Missions tab on the event page to preview what each guest got</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-stone-300 mt-0.5">&#9744;</span>
                  <p className="text-stone-600"><span className="font-medium text-stone-800">Watch it unfold</span> — on event day, open the event page to see the leaderboard and feed update in real time</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate(`/organizer/event/${createdEventId}`)}
              className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
            >
              Go to Event Page
            </button>

            <button
              onClick={() => navigate('/organizer')}
              className="w-full py-3 rounded-xl border border-stone-300 text-stone-600 font-semibold hover:bg-stone-200 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-600 text-sm mt-4">{error}</p>
        )}

        {/* Helper note for edit mode */}
        {isEditMode && !launched && (
          <p className="text-stone-400 text-xs text-center mt-4">
            You can edit this event at any time before it goes live.
          </p>
        )}

        {/* Navigation buttons */}
        {!launched && (
          <div className="mt-8 space-y-3">
            {step < 4 ? (
              <button
                onClick={nextStep}
                className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={launching}
                className="w-full py-3 rounded-xl bg-emerald-700 text-white font-semibold text-lg hover:bg-emerald-800 active:bg-emerald-900 transition-colors disabled:opacity-50"
              >
                {launching
                  ? isEditMode ? 'Saving...' : 'Creating...'
                  : isEditMode ? 'Save Changes' : 'Create Event'}
              </button>
            )}
          </div>
        )}
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

function formatDateTimeLocal(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
