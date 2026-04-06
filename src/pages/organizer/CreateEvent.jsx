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

const STEP_LABELS = ['Event Basics', 'Game Setup', 'Review & Launch']

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

  // Step 2 — Game Setup (Participants + Missions)
  const [maxParticipants, setMaxParticipants] = useState(25)
  const [participantNames, setParticipantNames] = useState('')
  const [anonymityEnabled, setAnonymityEnabled] = useState(false)
  const [feedMode, setFeedMode] = useState('secret')
  const [feedPhotosEnabled, setFeedPhotosEnabled] = useState(true)
  const [feedCommentsEnabled, setFeedCommentsEnabled] = useState(true)
  const [feedReactionsEnabled, setFeedReactionsEnabled] = useState(true)
  const [feedInteractiveCommentsEnabled, setFeedInteractiveCommentsEnabled] = useState(false)
  const [feedHidden, setFeedHidden] = useState(false)
  const [showAdvancedFeed, setShowAdvancedFeed] = useState(false)

  const [missionCount, setMissionCount] = useState(3)
  const [unlockType, setUnlockType] = useState('all_at_once')
  const [unlockTimes, setUnlockTimes] = useState(['', ''])
  const [categories, setCategories] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [availableMissionCount, setAvailableMissionCount] = useState(0)
  const [expandedCategories, setExpandedCategories] = useState({})
  const [categoryMissions, setCategoryMissions] = useState({})
  const [categoryMissionCounts, setCategoryMissionCounts] = useState({})

  // Step 3 — Review & Launch
  const [eventCode, setEventCode] = useState('')
  const [generatedParticipants, setGeneratedParticipants] = useState([])
  const [launched, setLaunched] = useState(false)
  const [createdEventId, setCreatedEventId] = useState(null)
  const [reviewTab, setReviewTab] = useState('summary')
  const [previewMissions, setPreviewMissions] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

  // Post-launch fields (moved from Step 1)
  const [howHeard, setHowHeard] = useState('')
  const [emailOptIn, setEmailOptIn] = useState(false)
  const [organizerEmail, setOrganizerEmail] = useState('')

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
      if (data.feed_mode) setFeedMode(data.feed_mode)
      setFeedPhotosEnabled(data.feed_photos_enabled !== false)
      setFeedCommentsEnabled(data.feed_comments_enabled !== false)
      setFeedReactionsEnabled(data.feed_reactions_enabled !== false)
      setFeedInteractiveCommentsEnabled(data.feed_interactive_comments_enabled === true)
      setFeedHidden(data.feed_hidden === true)
      const config = Array.isArray(data.event_config)
        ? data.event_config[0]
        : data.event_config
      if (config) {
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
        setParticipantNames(parts.map(p => p.name).join('\n'))
      }
      if (data.max_participants) {
        setMaxParticipants(data.max_participants)
      } else {
        setMaxParticipants(null)
      }
      if (data.event_code) setEventCode(data.event_code)
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

  // Load categories and their mission counts
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
        // Load mission counts per category
        const counts = {}
        for (const cat of data) {
          const { count } = await supabase
            .from('missions')
            .select('id', { count: 'exact', head: true })
            .eq('active', true)
            .eq('category_id', cat.id)
          counts[cat.id] = count || 0
        }
        setCategoryMissionCounts(counts)
      }
    }
    loadCategories()
  }, [])

  // Load missions for expanded categories on demand
  async function toggleCategoryExpanded(catId) {
    setExpandedCategories((prev) => {
      const next = { ...prev }
      next[catId] = !next[catId]
      return next
    })
    // Lazy-load missions for this category if not cached
    if (!categoryMissions[catId]) {
      const { data } = await supabase
        .from('missions')
        .select('id, text')
        .eq('active', true)
        .eq('category_id', catId)
        .order('text')
      if (data) {
        setCategoryMissions((prev) => ({ ...prev, [catId]: data }))
      }
    }
  }

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

  // Auto-fill timed unlock slots when switching to timed release
  useEffect(() => {
    if (unlockType === 'timed' && startTime && endTime) {
      const hasAnyFilled = unlockTimes.some((t) => t.trim() !== '')
      if (!hasAnyFilled) {
        const start = new Date(startTime)
        const end = new Date(endTime)
        const totalMs = end.getTime() - start.getTime()
        const slots = Math.max(missionCount, 2)
        const newTimes = []
        for (let i = 0; i < slots; i++) {
          const offset = (totalMs * i) / (slots - 1 || 1)
          const slotTime = new Date(start.getTime() + offset)
          newTimes.push(formatDateTimeLocal(slotTime))
        }
        setUnlockTimes(newTimes)
      }
    }
  }, [unlockType])

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) {
      if (sessionStorage.getItem('pq_signed_out')) {
        navigate('/organizer')
        return
      }
      // Save intended destination so AuthCallback can return here
      sessionStorage.setItem('pq_auth_redirect', window.location.pathname)
      signInWithGoogle()
    }
  }, [user, authLoading])

  if (authLoading || !user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="pq-spinner" />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
            Loading...
          </p>
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
      if (selectedTags.length === 0)
        return 'Select at least one mission category.'
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
    if (step === 2) {
      prepareReview()
      loadPreviewMissions()
    }
    setStep(step + 1)
  }

  function prevStep() {
    setError('')
    setStep(step - 1)
  }

  function prepareReview() {
    // Generate event code only for new events; preserve existing code when editing
    if (!isEditMode) {
      const code = generateCode(6)
      setEventCode(code)
    }

    // Parse names — only create participants for names actually entered
    const names = participantNames
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter(Boolean)

    const participants = names.map((name) => ({
      name,
      accessCode: generateCode(6),
      isNamed: true,
    }))
    setGeneratedParticipants(participants)
  }

  async function loadPreviewMissions() {
    setPreviewLoading(true)
    try {
      let query = supabase
        .from('missions')
        .select('id, text, category_id, categories(name)')
        .eq('active', true)

      if (selectedTags.length > 0) {
        query = query.in('category_id', selectedTags)
      }

      const { data } = await query.limit(50)
      if (data && data.length > 0) {
        // Shuffle and pick missionCount samples
        const shuffled = [...data].sort(() => Math.random() - 0.5)
        setPreviewMissions(shuffled.slice(0, missionCount))
      }
    } catch (err) {
      console.error('Failed to load preview missions:', err)
    }
    setPreviewLoading(false)
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
        max_participants: maxParticipants,
        anonymity_enabled: anonymityEnabled,
        feed_mode: feedMode,
        feed_photos_enabled: feedPhotosEnabled,
        feed_comments_enabled: feedCommentsEnabled,
        feed_reactions_enabled: feedReactionsEnabled,
        feed_interactive_comments_enabled: feedInteractiveCommentsEnabled,
        feed_hidden: feedHidden,
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

        // Insert named participants (if any)
        let allParticipants = []

        if (generatedParticipants.length > 0) {
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
          allParticipants = insertedParticipants
        }

        // Also pick up any self-registered participants who joined before launch
        const { data: earlyRegistrants } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', eventData.id)
          .eq('is_active', true)
          .eq('source', 'self')

        if (earlyRegistrants && earlyRegistrants.length > 0) {
          allParticipants = [...allParticipants, ...earlyRegistrants]
        }

        // Assign missions to all participants (named + early self-registered)
        if (allParticipants.length > 0) {
          await assignMissionsToAll(allParticipants, eventData.id)
        }

        setCreatedEventId(eventData.id)
        setLaunched(true)
      }
    } catch (err) {
      setError(err.message || 'Failed to create event. Please try again.')
    }

    setLaunching(false)
  }

  async function assignMissionsToAll(participants, eventId) {
    // Get eligible missions — try with tag filter first, fallback to all
    let missions = null

    if (selectedTags.length > 0) {
      const { data } = await supabase
        .from('missions')
        .select('id')
        .eq('active', true)
        .in('category_id', selectedTags)
      missions = data
    }

    if (!missions || missions.length === 0) {
      const { data } = await supabase
        .from('missions')
        .select('id')
        .eq('active', true)
      missions = data
    }

    if (!missions || missions.length === 0) return

    // Get existing assignment counts for this event (in case some participants
    // self-registered early and already have missions, or for future shared missions)
    const participantIds = participants.map((p) => p.id)
    const { data: existingAssignments } = await supabase
      .from('participant_missions')
      .select('mission_id')
      .in('participant_id', participantIds)

    // Build assignment count map across ALL event participants
    const assignmentCounts = {}
    missions.forEach((m) => (assignmentCounts[m.id] = 0))
    if (existingAssignments) {
      existingAssignments.forEach((a) => {
        if (assignmentCounts[a.mission_id] !== undefined) {
          assignmentCounts[a.mission_id]++
        }
      })
    }

    // Build unlock schedule
    const schedule =
      unlockType === 'timed'
        ? unlockTimes
            .filter((t) => t.trim())
            .map((t) => new Date(t).toISOString())
        : null

    const allRows = []

    for (const participant of participants) {
      // Check if this participant already has missions (self-registered early)
      const { data: existingMissions } = await supabase
        .from('participant_missions')
        .select('mission_id')
        .eq('participant_id', participant.id)

      const alreadyAssigned = new Set(
        (existingMissions || []).map((m) => m.mission_id)
      )
      const needed = missionCount - alreadyAssigned.size
      if (needed <= 0) continue

      // Leveled round-robin: sort by least-assigned, shuffle within same count
      const eligible = missions.filter((m) => !alreadyAssigned.has(m.id))
      const sorted = [...eligible].sort((a, b) => {
        const diff = (assignmentCounts[a.id] || 0) - (assignmentCounts[b.id] || 0)
        if (diff !== 0) return diff
        return Math.random() - 0.5 // shuffle within same level
      })

      const selected = sorted.slice(0, needed)

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


  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
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
            className="pq-btn pq-btn-ghost"
            style={{ fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
          >
            {launched ? 'View Event' : step === 1 ? (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Dashboard
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
                </svg>
                Back
              </>
            )}
          </button>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              color: 'var(--color-primary)',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            {isEditMode ? 'Edit Event' : 'Create Event'}
          </h1>
          <div className="w-16" />
        </div>

        {/* Step Progress Indicator */}
        {!launched && (
          <div className="flex items-center justify-between mb-10 px-2">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1
              const isComplete = stepNum < step
              const isCurrent = stepNum === step
              const isFuture = stepNum > step
              return (
                <div key={stepNum} className="flex items-center" style={{ flex: i < STEP_LABELS.length - 1 ? 1 : 'none' }}>
                  {/* Step circle + label */}
                  <div className="flex flex-col items-center gap-1.5" style={{ minWidth: '64px' }}>
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-full)',
                        fontFamily: 'var(--font-heading)',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        transition: 'var(--transition-base)',
                        background: isCurrent
                          ? 'var(--color-primary)'
                          : isComplete
                            ? 'var(--color-success)'
                            : 'var(--color-surface)',
                        color: isCurrent || isComplete
                          ? 'var(--color-text-inverse)'
                          : 'var(--color-text-muted)',
                        border: isFuture ? '2px solid var(--color-border)' : 'none',
                        boxShadow: isCurrent ? 'var(--shadow-glow)' : 'none',
                      }}
                    >
                      {isComplete ? '\u2713' : stepNum}
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.75rem',
                        fontWeight: isCurrent ? 600 : 400,
                        color: isCurrent
                          ? 'var(--color-primary)'
                          : isComplete
                            ? 'var(--color-success)'
                            : 'var(--color-text-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className="mx-2"
                      style={{
                        flex: 1,
                        height: '2px',
                        borderRadius: 'var(--radius-full)',
                        background: isComplete
                          ? 'var(--color-success)'
                          : 'var(--color-border-light)',
                        marginBottom: '24px',
                        transition: 'var(--transition-base)',
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Step 1 -- Event Basics */}
        {step === 1 && (
          <div className="pq-card animate-fade-in" style={{ padding: '2rem' }}>
            <div className="mb-6">
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-text)',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                }}
              >
                Event Basics
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                Tell us about your event. The start and end times control when missions go live and when the event wraps up.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              {/* Event Name */}
              <div>
                <label
                  className="block mb-1.5"
                  style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                >
                  Event Name *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="e.g. Sarah's Birthday Bash"
                  className="pq-input w-full"
                  autoFocus
                />
              </div>

              {/* Event Type */}
              <div>
                <label
                  className="block mb-1.5"
                  style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                >
                  Event Type
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  disabled={isEditMode && editEventStatus === 'active'}
                  className="pq-input w-full"
                  style={{ cursor: (isEditMode && editEventStatus === 'active') ? 'not-allowed' : 'pointer' }}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                {isEditMode && editEventStatus === 'active' && (
                  <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    Cannot change event type while active
                  </p>
                )}
              </div>

              {/* Start / End times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className="block mb-1.5"
                    style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                  >
                    Start *
                  </label>
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => {
                      const newStart = e.target.value
                      setStartTime(newStart)
                      // Auto-adjust end date to 4 hours after new start
                      if (newStart) {
                        const startDate = new Date(newStart)
                        const newEnd = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)
                        setEndTime(formatDateTimeLocal(newEnd))
                      }
                    }}
                    className="pq-input w-full"
                  />
                </div>
                <div>
                  <label
                    className="block mb-1.5"
                    style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                  >
                    End *
                  </label>
                  <input
                    type="datetime-local"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="pq-input w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2 -- Game Setup (Participants + Missions combined) */}
        {step === 2 && (
          <div className="animate-fade-in flex flex-col gap-5">

            {/* --- Participants Section --- */}
            <div className="pq-card" style={{ padding: '2rem' }}>
              <div className="mb-6">
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-text)',
                    fontSize: '1.75rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  Game Setup
                </h2>
                <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Set up your guest list and configure the missions. Don't stress about getting everyone -- you can always add more after the event is created.
                </p>
              </div>

              {/* Invite link callout */}
              <div
                className="mb-5"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-primary-subtle)',
                  border: '1px solid var(--color-primary-light)',
                  padding: '1rem 1.25rem',
                }}
              >
                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
                  Option A: Share an invite link
                </h4>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  After creating the event, you'll get a shareable link and QR code. Send it out and guests register themselves -- no names needed upfront.
                </p>
              </div>

              {/* Max headcount */}
              <div
                style={{
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-light)',
                  padding: '1.25rem',
                }}
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <label
                      className="block mb-1.5"
                      style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                    >
                      Max number of participants
                    </label>
                    <select
                      value={maxParticipants === null ? 'none' : maxParticipants}
                      onChange={(e) => {
                        const val = e.target.value
                        setMaxParticipants(val === 'none' ? null : parseInt(val))
                      }}
                      className="pq-input w-full"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={75}>75</option>
                      <option value="none">No Limit</option>
                    </select>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                      Guests can join via invite link up to this limit.
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
                      Option B: Pre-register participants
                    </h4>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                      If you know the names of all (or some) participants at this event, you can input them below and they will be added to your event.
                    </p>
                    <label
                      className="block mb-1.5"
                      style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                    >
                      Participant names (optional)
                    </label>
                    <textarea
                      ref={textareaRef}
                      value={participantNames}
                      onChange={(e) => setParticipantNames(e.target.value)}
                      placeholder={"Jake\nSarah\nMike\nTaylor"}
                      rows={4}
                      style={{ minHeight: '120px', maxHeight: '400px', overflow: 'auto', resize: 'none' }}
                      className="pq-input w-full"
                    />
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                      One per line. These guests get access codes at launch. Everyone else joins via invite link.
                    </p>
                  </div>
                </div>
              </div>

              {/* Anonymity toggle */}
              <div className="mt-5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymityEnabled}
                    onChange={(e) => setAnonymityEnabled(e.target.checked)}
                    style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    Hide participant names on leaderboard
                  </span>
                </label>
              </div>
            </div>

            {/* --- Missions Section --- */}
            <div className="pq-card" style={{ padding: '2rem' }}>
              <div className="mb-6">
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    color: 'var(--color-text)',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                  }}
                >
                  Missions
                </h3>
                <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Choose how many missions each guest gets and how they unlock. Missions are pulled from our library based on the categories you pick.
                </p>
              </div>

              {isEditMode && editEventStatus === 'active' && (
                <div
                  className="mb-5"
                  style={{
                    background: 'var(--color-warning-light)',
                    border: '1px solid var(--color-warning)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0.875rem 1rem',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.875rem',
                    color: 'var(--color-warning)',
                  }}
                >
                  Mission settings cannot be changed while the event is active.
                </div>
              )}

              <div className="flex flex-col gap-6">
                {/* Mission count slider */}
                <div>
                  <label
                    className="block mb-2"
                    style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                  >
                    Missions per participant:{' '}
                    <span style={{ color: 'var(--color-primary)', fontWeight: 700 }}>{missionCount}</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={missionCount}
                    onChange={(e) => setMissionCount(parseInt(e.target.value))}
                    disabled={isEditMode && editEventStatus === 'active'}
                    className="w-full"
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <div className="flex justify-between mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Unlock type */}
                <div>
                  <label
                    className="block mb-1.5"
                    style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                  >
                    Unlock Type
                  </label>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    All at once = guests see every mission from the start. Timed = missions reveal throughout the event to keep things exciting.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUnlockType('all_at_once')}
                      className={unlockType === 'all_at_once' ? 'pq-btn pq-btn-primary' : 'pq-btn pq-btn-secondary'}
                      style={{ fontFamily: 'var(--font-body)', padding: '0.75rem 1rem' }}
                    >
                      All at Once
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnlockType('timed')}
                      className={unlockType === 'timed' ? 'pq-btn pq-btn-primary' : 'pq-btn pq-btn-secondary'}
                      style={{ fontFamily: 'var(--font-body)', padding: '0.75rem 1rem' }}
                    >
                      Timed Release
                    </button>
                  </div>
                </div>

                {/* Timed unlock inputs */}
                {unlockType === 'timed' && (
                  <div className="flex flex-col gap-3">
                    <label
                      className="block"
                      style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                    >
                      Unlock Times
                    </label>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '-0.5rem', lineHeight: 1.4 }}>
                      Pre-filled evenly across your event. Adjust as needed.
                    </p>
                    {unlockTimes.map((time, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.8rem',
                            color: 'var(--color-text-muted)',
                            minWidth: '48px',
                          }}
                        >
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
                          className="pq-input flex-1"
                        />
                        {unlockTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = unlockTimes.filter((_, idx) => idx !== i)
                              setUnlockTimes(updated)
                            }}
                            className="pq-btn pq-btn-ghost"
                            style={{ padding: '0.375rem', color: 'var(--color-text-muted)', minWidth: 'auto' }}
                            aria-label="Remove slot"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setUnlockTimes([...unlockTimes, ''])}
                      className="pq-btn pq-btn-ghost"
                      style={{
                        fontFamily: 'var(--font-body)',
                        color: 'var(--color-primary)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        alignSelf: 'flex-start',
                      }}
                    >
                      + Add unlock time
                    </button>
                  </div>
                )}

                {/* Categories — expandable with mission preview */}
                <div>
                  <label
                    className="block mb-2"
                    style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                  >
                    Categories
                  </label>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                    Check the categories you want to include. Expand any category to preview its missions.
                  </p>
                  <div className="flex flex-col gap-1">
                    {categories.map((cat) => {
                      const isSelected = selectedTags.includes(cat.id)
                      const isExpanded = expandedCategories[cat.id]
                      const missions = categoryMissions[cat.id]
                      const count = categoryMissionCounts[cat.id] ?? '...'
                      return (
                        <div
                          key={cat.id}
                          style={{
                            borderRadius: 'var(--radius-lg)',
                            border: isSelected ? '1.5px solid var(--color-primary-light)' : '1px solid var(--color-border-light)',
                            background: isSelected ? 'var(--color-primary-subtle)' : 'var(--color-surface)',
                            overflow: 'hidden',
                            transition: 'var(--transition-fast)',
                          }}
                        >
                          {/* Category header row */}
                          <div
                            className="flex items-center gap-3 px-3 py-2.5"
                            style={{ cursor: 'pointer' }}
                          >
                            {/* Checkbox */}
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedTags((prev) =>
                                  isSelected
                                    ? prev.filter((t) => t !== cat.id)
                                    : [...prev, cat.id]
                                )
                              }}
                              style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                            />
                            {/* Name + count — click to expand */}
                            <div
                              className="flex-1 flex items-center justify-between"
                              onClick={() => toggleCategoryExpanded(cat.id)}
                            >
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                {cat.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                  {count} missions
                                </span>
                                <svg
                                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                                  strokeLinecap="round" strokeLinejoin="round"
                                  style={{
                                    color: 'var(--color-text-muted)',
                                    transition: 'transform 0.2s ease',
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          {/* Expanded mission list */}
                          {isExpanded && (
                            <div
                              style={{
                                borderTop: '1px solid var(--color-border-light)',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                padding: '0.375rem 0',
                              }}
                            >
                              {!missions ? (
                                <div className="flex items-center justify-center py-3">
                                  <div className="pq-spinner" style={{ width: '16px', height: '16px' }} />
                                </div>
                              ) : missions.length === 0 ? (
                                <p className="px-4 py-2" style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                  No active missions in this category.
                                </p>
                              ) : (
                                <ol style={{ margin: 0, paddingLeft: '1.75rem', listStyleType: 'decimal' }}>
                                {missions.map((m) => (
                                  <li
                                    key={m.id}
                                    style={{
                                      fontFamily: 'var(--font-body)',
                                      fontSize: '0.8rem',
                                      color: 'var(--color-text-secondary)',
                                      lineHeight: 1.4,
                                      padding: '0.25rem 0.5rem',
                                      borderBottom: '1px solid var(--color-border-light)',
                                    }}
                                  >
                                    {m.text}
                                  </li>
                                ))}
                              </ol>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Mission availability summary with explicit math */}
                <div
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border-light)',
                    padding: '1rem 1.25rem',
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                      {availableMissionCount} missions available
                    </p>
                    <span
                      className="pq-badge"
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.75rem',
                        background: availableMissionCount === 0
                          ? 'var(--color-danger-light)'
                          : 'var(--color-success-light)',
                        color: availableMissionCount === 0
                          ? 'var(--color-danger)'
                          : 'var(--color-success)',
                        border: 'none',
                      }}
                    >
                      {missionCount} missions per guest
                    </span>
                  </div>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                    Missions are distributed evenly. When all missions have been assigned once, they cycle again.
                  </p>
                  {availableMissionCount === 0 && (
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-danger)', marginTop: '0.375rem' }}>
                      No missions match your selected categories.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* --- Hide Feed Toggle --- */}
            <div className="pq-card" style={{ padding: '1.25rem 2rem' }}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={feedHidden}
                  onChange={(e) => setFeedHidden(e.target.checked)}
                  style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                />
                <div>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>
                    Hide activity feed during the event
                  </span>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem', lineHeight: 1.4 }}>
                    Participants and spectators won't see the feed tab. Useful if you want to keep completions private until the event ends.
                  </p>
                </div>
              </label>
            </div>

            {/* --- Advanced: Activity Feed Settings (collapsible) --- */}
            <div className="pq-card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowAdvancedFeed(!showAdvancedFeed)}
                className="w-full flex items-center justify-between text-left"
                style={{
                  padding: '1.25rem 2rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center gap-2">
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--color-text)',
                      margin: 0,
                    }}
                  >
                    Activity Feed Settings
                  </h3>
                  <span
                    className="pq-badge pq-badge-muted"
                    style={{ fontSize: '0.65rem', fontFamily: 'var(--font-body)' }}
                  >
                    Advanced
                  </span>
                </div>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    color: 'var(--color-text-muted)',
                    transition: 'transform 0.2s ease',
                    transform: showAdvancedFeed ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {showAdvancedFeed && (
                <div style={{ padding: '0 2rem 2rem 2rem', borderTop: '1px solid var(--color-border-light)' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', marginTop: '1rem', lineHeight: 1.5 }}>
                    Control what participants and spectators see in the live activity feed when missions are completed.
                  </p>

                  {/* Feed mode */}
                  <div className="mb-4">
                    <label
                      className="block mb-1.5"
                      style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                    >
                      Mission Visibility
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFeedMode('secret')}
                        className={feedMode === 'secret' ? 'pq-btn pq-btn-primary' : 'pq-btn pq-btn-secondary'}
                        style={{ fontFamily: 'var(--font-body)', padding: '0.75rem 1rem', fontSize: '0.8rem' }}
                      >
                        Secret
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedMode('transparent')}
                        className={feedMode === 'transparent' ? 'pq-btn pq-btn-primary' : 'pq-btn pq-btn-secondary'}
                        style={{ fontFamily: 'var(--font-body)', padding: '0.75rem 1rem', fontSize: '0.8rem' }}
                      >
                        Show Mission
                      </button>
                    </div>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.375rem' }}>
                      {feedMode === 'secret'
                        ? 'Feed shows "Completed a mission" without revealing what it was.'
                        : 'Feed shows the actual mission text that was completed.'}
                    </p>
                  </div>

                  {/* Photo toggle */}
                  <div className="mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedPhotosEnabled}
                        onChange={(e) => setFeedPhotosEnabled(e.target.checked)}
                        style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        Show photos in the activity feed
                      </span>
                    </label>
                  </div>

                  {/* Comments toggle */}
                  <div className="mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedCommentsEnabled}
                        onChange={(e) => setFeedCommentsEnabled(e.target.checked)}
                        style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        Show completion notes in the activity feed
                      </span>
                    </label>
                  </div>

                  {/* Emoji reactions toggle */}
                  <div className="mb-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedReactionsEnabled}
                        onChange={(e) => setFeedReactionsEnabled(e.target.checked)}
                        style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        Allow emoji reactions on completions
                      </span>
                    </label>
                  </div>

                  {/* Interactive comments toggle */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feedInteractiveCommentsEnabled}
                        onChange={(e) => setFeedInteractiveCommentsEnabled(e.target.checked)}
                        style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                      />
                      <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                        Allow comments on completions
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3 -- Review & Launch */}
        {step === 3 && !launched && (
          <div className="animate-fade-in flex flex-col gap-5">

            {/* Summary / Preview toggle */}
            <div
              className="flex"
              style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-light)',
                padding: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setReviewTab('summary')}
                style={{
                  flex: 1,
                  padding: '0.625rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  background: reviewTab === 'summary' ? 'var(--color-primary)' : 'transparent',
                  color: reviewTab === 'summary' ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                }}
              >
                Summary
              </button>
              <button
                type="button"
                onClick={() => setReviewTab('preview')}
                style={{
                  flex: 1,
                  padding: '0.625rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'var(--transition-fast)',
                  background: reviewTab === 'preview' ? 'var(--color-primary)' : 'transparent',
                  color: reviewTab === 'preview' ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
                }}
              >
                Preview as Guest
              </button>
            </div>

            {/* --- Summary Tab --- */}
            {reviewTab === 'summary' && (
              <>
                <div className="pq-card" style={{ padding: '2rem' }}>
                  <h2
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--color-text)',
                      fontSize: '1.75rem',
                      fontWeight: 700,
                      marginBottom: '1.5rem',
                    }}
                  >
                    Review & Launch
                  </h2>

                  {/* Event Summary */}
                  <div
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border-light)',
                      padding: '1.25rem',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                      Event Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {[
                        ['Name', eventName],
                        ['Type', eventType],
                        ['Start', new Date(startTime).toLocaleString()],
                        ['End', new Date(endTime).toLocaleString()],
                        ['Max participants', maxParticipants || 'No Limit'],
                        ['Pre-registered', generatedParticipants.length || 'None'],
                        ['Missions each', missionCount],
                        ['Unlock', unlockType === 'all_at_once' ? 'All at once' : 'Timed release'],
                      ].map(([label, value]) => (
                        <div key={label} className="py-1" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block' }}>
                            {label}
                          </span>
                          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 500 }}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                    {anonymityEnabled && (
                      <div className="mt-3">
                        <span className="pq-badge pq-badge-warning" style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem' }}>
                          Anonymous leaderboard
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Event Code -- prominent card */}
                <div
                  className="pq-card animate-scale-in"
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    background: 'var(--color-primary-subtle)',
                    border: '2px solid var(--color-primary-light)',
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '0.5rem' }}>
                    Event Code
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '2.5rem',
                      fontWeight: 800,
                      color: 'var(--color-primary)',
                      letterSpacing: '0.2em',
                      lineHeight: 1.2,
                    }}
                  >
                    {eventCode}
                  </p>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginTop: '0.5rem' }}>
                    Participants and spectators use this to join
                  </p>
                </div>

                {/* Participant Codes */}
                <div className="pq-card" style={{ padding: '1.5rem 2rem' }}>
                  {generatedParticipants.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-text)', fontSize: '1rem' }}>
                          Pre-registered Access Codes
                        </h3>
                        <button
                          onClick={copyAllCodes}
                          className="pq-btn pq-btn-ghost"
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: copiedKey === 'allCodes' ? 'var(--color-success)' : 'var(--color-primary)',
                          }}
                        >
                          {copiedKey === 'allCodes' ? '\u2713 Copied!' : 'Copy All'}
                        </button>
                      </div>
                      <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                        {generatedParticipants.map((p, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between py-2 px-2"
                            style={{
                              borderBottom: i < generatedParticipants.length - 1 ? '1px solid var(--color-border-light)' : 'none',
                              borderRadius: 'var(--radius-sm)',
                            }}
                          >
                            <span
                              className="truncate mr-4"
                              style={{
                                fontFamily: 'var(--font-body)',
                                fontSize: '0.875rem',
                                color: 'var(--color-text)',
                              }}
                            >
                              {p.name}
                            </span>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                color: 'var(--color-text)',
                                letterSpacing: '0.1em',
                                flexShrink: 0,
                              }}
                            >
                              {p.accessCode}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-text)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                        No Pre-registered Guests
                      </h3>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        All guests will join via the invite link. Share the event code after launch.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* --- Preview as Guest Tab --- */}
            {reviewTab === 'preview' && (
              <div className="flex flex-col gap-4">
                {/* Preview banner */}
                <div
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-primary-subtle)',
                    border: '1px solid var(--color-primary-light)',
                    padding: '0.875rem 1.25rem',
                    textAlign: 'center',
                  }}
                >
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                    This is what your guests will see when they open their missions
                  </p>
                </div>

                {/* Fake phone frame */}
                <div
                  style={{
                    borderRadius: 'var(--radius-xl)',
                    border: '3px solid var(--color-border)',
                    background: 'var(--color-bg)',
                    overflow: 'hidden',
                    maxWidth: '380px',
                    margin: '0 auto',
                    width: '100%',
                  }}
                >
                  {/* Phone header */}
                  <div
                    style={{
                      background: 'var(--color-surface)',
                      borderBottom: '1px solid var(--color-border-light)',
                      padding: '1rem 1.25rem 0.75rem',
                    }}
                  >
                    <h3
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: 'var(--color-primary)',
                        marginBottom: '0.25rem',
                      }}
                    >
                      {eventName}
                    </h3>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {generatedParticipants[0]?.name || 'Your Guest'}'s Missions
                    </p>

                    {/* Progress bar */}
                    <div className="mt-3 mb-1">
                      <div className="flex items-center justify-between mb-1">
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                          0 of {missionCount} complete
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          borderRadius: 'var(--radius-full)',
                          background: 'var(--color-border-light)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: '0%',
                            height: '100%',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--color-primary)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mission cards */}
                  <div style={{ padding: '0.75rem 1rem 1.25rem' }} className="flex flex-col gap-2.5">
                    {previewLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="pq-spinner" />
                      </div>
                    ) : previewMissions.length === 0 ? (
                      <p className="text-center py-8" style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        No preview missions available.
                      </p>
                    ) : (
                      <>
                        {previewMissions.map((m, i) => {
                          const isLocked = unlockType === 'timed' && i > 0
                          const category = m.categories?.name

                          if (isLocked) {
                            // Locked mission card
                            const unlockLabel = unlockTimes[i]
                              ? new Date(unlockTimes[i]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                              : `Later`
                            return (
                              <div
                                key={m.id}
                                className="pq-card w-full"
                                style={{
                                  background: 'var(--color-surface-hover)',
                                  borderColor: 'var(--color-border)',
                                  borderStyle: 'dashed',
                                  borderWidth: '1.5px',
                                  opacity: 0.7,
                                  minHeight: 60,
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className="flex-shrink-0 flex items-center justify-center"
                                    style={{
                                      width: 28, height: 28,
                                      borderRadius: 'var(--radius-full)',
                                      background: 'var(--color-border)',
                                    }}
                                  >
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-muted)' }}>
                                      <rect x="3" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                                      <path d="M5 7V5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                      <circle cx="8" cy="11" r="1" fill="currentColor" />
                                    </svg>
                                  </div>
                                  <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>
                                    Unlocks at {unlockLabel}
                                  </p>
                                </div>
                              </div>
                            )
                          }

                          // Unlocked mission card
                          return (
                            <div
                              key={m.id}
                              className="pq-card w-full"
                              style={{ minHeight: 44 }}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className="flex-shrink-0 flex items-center justify-center"
                                  style={{
                                    width: 28, height: 28,
                                    borderRadius: 'var(--radius-full)',
                                    border: '2px solid var(--color-border-strong)',
                                    background: 'var(--color-surface)',
                                  }}
                                />
                                <div className="flex-1 min-w-0">
                                  <p style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}>
                                    {m.text}
                                  </p>
                                </div>
                                {category && (
                                  <span className="pq-badge pq-badge-muted flex-shrink-0" style={{ fontSize: 10 }}>
                                    {category}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>

                  {/* Fake bottom nav */}
                  <div
                    className="flex items-center justify-around"
                    style={{
                      borderTop: '1px solid var(--color-border-light)',
                      background: 'var(--color-surface)',
                      padding: '0.625rem 0 0.875rem',
                    }}
                  >
                    {[
                      { label: 'Missions', active: true },
                      { label: 'Leaderboard', active: false },
                      { label: 'Feed', active: false },
                    ].map((t) => (
                      <div
                        key={t.label}
                        className="flex flex-col items-center gap-0.5"
                        style={{ opacity: t.active ? 1 : 0.4 }}
                      >
                        <div
                          style={{
                            width: 6, height: 6,
                            borderRadius: 'var(--radius-full)',
                            background: t.active ? 'var(--color-primary)' : 'transparent',
                          }}
                        />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontWeight: t.active ? 700 : 400, color: t.active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                          {t.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                    textAlign: 'center',
                    marginTop: '0.25rem',
                  }}
                >
                  Sample missions shown — each guest gets a unique random set
                </p>
              </div>
            )}
          </div>
        )}

        {/* Launched state */}
        {launched && (
          <div className="animate-fade-in flex flex-col gap-5">
            {/* Celebration card */}
            <div
              className="pq-card animate-scale-in"
              style={{
                padding: '2.5rem 2rem',
                textAlign: 'center',
                background: 'var(--color-primary-subtle)',
                border: '2px solid var(--color-primary-light)',
              }}
            >
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2rem',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                  marginBottom: '0.5rem',
                }}
              >
                Event Created!
              </h2>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--color-text-secondary)', marginBottom: '1rem' }}>
                {eventName} is ready to go.
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: 'var(--color-primary)',
                  letterSpacing: '0.2em',
                  lineHeight: 1.2,
                }}
              >
                {eventCode}
              </p>
            </div>

            {/* Post-launch: How heard + email opt-in */}
            <div className="pq-card" style={{ padding: '1.75rem 2rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.25rem', fontSize: '1rem' }}>
                One more thing (optional)
              </h3>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                Help us improve Party Quest and stay in the loop.
              </p>

              <div className="flex flex-col gap-4">
                <div>
                  <label
                    className="block mb-1.5"
                    style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}
                  >
                    How did you hear about Party Quest?
                  </label>
                  <select
                    value={howHeard}
                    onChange={async (e) => {
                      setHowHeard(e.target.value)
                      if (createdEventId) {
                        await supabase
                          .from('events')
                          .update({ how_heard: e.target.value || null })
                          .eq('id', createdEventId)
                      }
                    }}
                    className="pq-input w-full"
                  >
                    <option value="">-- Select --</option>
                    {HOW_HEARD_OPTIONS.map((o) => (
                      <option key={o} value={o.toLowerCase()}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailOptIn}
                    onChange={async (e) => {
                      setEmailOptIn(e.target.checked)
                      if (createdEventId) {
                        await supabase
                          .from('events')
                          .update({
                            email_opt_in: e.target.checked,
                            organizer_email: e.target.checked ? organizerEmail : null,
                          })
                          .eq('id', createdEventId)
                      }
                    }}
                    style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }}
                  />
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    Send me a post-event summary
                  </span>
                </label>
                {emailOptIn && (
                  <input
                    type="email"
                    value={organizerEmail}
                    onChange={(e) => setOrganizerEmail(e.target.value)}
                    onBlur={async () => {
                      if (createdEventId && emailOptIn) {
                        await supabase
                          .from('events')
                          .update({ organizer_email: organizerEmail })
                          .eq('id', createdEventId)
                      }
                    }}
                    placeholder="your@email.com"
                    className="pq-input w-full"
                  />
                )}
              </div>
            </div>

            <button
              onClick={() => navigate(`/organizer/event/${createdEventId}`)}
              className="pq-btn pq-btn-primary w-full"
              style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.125rem', padding: '0.875rem 1.5rem' }}
            >
              Go to Event Page
            </button>

            <button
              onClick={() => navigate('/organizer')}
              className="pq-btn pq-btn-secondary w-full"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '1rem', padding: '0.875rem 1.5rem' }}
            >
              Back to Dashboard
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="mt-5 animate-fade-in"
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-light)',
              border: '1px solid var(--color-danger)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--color-danger)' }}>
              {error}
            </p>
          </div>
        )}

        {/* Helper note for edit mode */}
        {isEditMode && !launched && (
          <p
            className="mt-5"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              textAlign: 'center',
            }}
          >
            You can edit this event at any time before it goes live.
          </p>
        )}

        {/* Navigation buttons */}
        {!launched && (
          <div className="mt-8">
            {step < 3 ? (
              <button
                onClick={nextStep}
                className="pq-btn pq-btn-primary w-full"
                style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.125rem', padding: '0.875rem 1.5rem' }}
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleLaunch}
                disabled={launching}
                className="pq-btn pq-btn-primary w-full"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  padding: '0.875rem 1.5rem',
                  opacity: launching ? 0.6 : 1,
                  cursor: launching ? 'not-allowed' : 'pointer',
                }}
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
        <div className="pq-toast animate-slide-up">
          <div className="pq-toast-inner" style={{ fontFamily: 'var(--font-body)' }}>
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
