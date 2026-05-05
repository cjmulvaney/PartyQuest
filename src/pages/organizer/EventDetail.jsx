import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase.js'
import { useAuth } from '../../hooks/useAuth.js'
import { getAvatarColor, getInitials } from '../../lib/avatar.js'
import { insertParticipantWithRetry, selectMissionsForParticipant } from '../../lib/missions.js'
import { normalizePhone } from '../../lib/phone.js'
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
  const [newParticipantPhone, setNewParticipantPhone] = useState('')
  // Inline edit (only allowed before the event has started)
  const [editingParticipantId, setEditingParticipantId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [sendingSms, setSendingSms] = useState(false)
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [customMessage, setCustomMessage] = useState('')
  const [sendingCustomSms, setSendingCustomSms] = useState(false)
  // Drag and drop — use refs for reliable access in event handlers, state for visuals
  const [dragSource, _setDragSource] = useState(null)
  const [dropTarget, _setDropTarget] = useState(null)
  const dragSourceRef = useRef(null)
  const dropTargetRef = useRef(null)
  const setDragSource = useCallback((val) => { dragSourceRef.current = val; _setDragSource(val) }, [])
  const setDropTarget = useCallback((val) => {
    // Dedup: skip if target hasn't changed (prevents excessive re-renders during drag)
    const prev = dropTargetRef.current
    if (prev?.type === val?.type && prev?.participantIdx === val?.participantIdx && prev?.missionIdx === val?.missionIdx) return
    dropTargetRef.current = val
    _setDropTarget(val)
  }, [])
  // Copy toast
  const [copyToast, setCopyToast] = useState('')
  const [copiedKey, setCopiedKey] = useState('')

  const copyIdRef = useRef(0)
  async function copyWithToast(text, label, key) {
    try {
      await navigator.clipboard.writeText(text)
      const myId = ++copyIdRef.current
      setCopyToast(label || 'Copied!')
      if (key) setCopiedKey(key)
      setTimeout(() => {
        // Only clear if this is still the most recent copy
        if (copyIdRef.current === myId) {
          setCopyToast('')
          setCopiedKey('')
        }
      }, 2000)
    } catch {
      // Clipboard API failed (non-HTTPS or denied) — don't show false success
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
      .select('id, name, access_code, joined_at, is_active, source, phone, sms_sent_at')
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
          .select('id, completed, completed_at, mission_id, missions(text, category_id, categories(name))')
          .eq('participant_id', p.id)
        return { ...p, missions: pm || [] }
      })
    )

    setMissionAssignments(assignments)
  }, [id])

  // Load all missions in the pool (for sidebar)
  const loadMissionPool = useCallback(async () => {
    let query = supabase.from('missions').select('id, text, category_id, categories(name)').eq('active', true)
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
      if (sessionStorage.getItem('pq_signed_out')) {
        navigate('/')
        return
      }
      signInWithGoogle()
      return
    }
    if (user) {
      sessionStorage.removeItem('pq_signed_out')
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
          feed_photos_enabled: event.feed_photos_enabled,
          feed_comments_enabled: event.feed_comments_enabled,
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
      // Enforce max participant limit before inserting
      if (event.max_participants) {
        const activeCount = participants.filter((p) => p.is_active !== false).length
        if (activeCount >= event.max_participants) {
          setError(`Cannot add participant: event is full (${event.max_participants} max).`)
          setAddingParticipant(false)
          return
        }
      }

      const phoneE164 = normalizePhone(newParticipantPhone)
      const newPart = await insertParticipantWithRetry(supabase, id, newParticipantName.trim(), 'manual', 3, phoneE164)

      // Assign missions immediately for upcoming or active events.
      // Unlock schedules still control when participants actually see them.
      if (event.status !== 'ended' && config) {
        try {
          await assignMissionsToParticipant(newPart, config)
        } catch (missionErr) {
          console.error('Mission assignment failed:', missionErr)
          setError('Participant added, but mission assignment failed. Assign missions manually from the missions tab.')
        }
      }

      setNewParticipantName('')
      setNewParticipantPhone('')
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

  function startEditParticipant(p) {
    setEditingParticipantId(p.id)
    setEditName(p.name || '')
    setEditPhone(p.phone || '')
    setError('')
  }

  function cancelEditParticipant() {
    setEditingParticipantId(null)
    setEditName('')
    setEditPhone('')
  }

  async function saveEditParticipant(participantId) {
    const trimmedName = editName.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    setSavingEdit(true)
    setError('')
    try {
      const phoneE164 = editPhone.trim() ? normalizePhone(editPhone) : null
      const { error: updateErr } = await supabase
        .from('participants')
        .update({ name: trimmedName, phone: phoneE164 })
        .eq('id', participantId)
      if (updateErr) throw updateErr
      cancelEditParticipant()
      await loadData()
    } catch (err) {
      setError(err.message || 'Failed to update participant.')
    }
    setSavingEdit(false)
  }

  async function handleSendSmsBlast() {
    setSendingSms(true)
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-event-sms-blast', {
        body: { eventId: id, scenario: 'event_started' },
      })
      if (fnErr) throw fnErr
      if (data?.ok) {
        setCopyToast(`SMS sent to ${data.sent} participant${data.sent !== 1 ? 's' : ''}`)
        setTimeout(() => setCopyToast(''), 3000)
        await loadData()
      } else {
        setError(data?.error || 'Failed to send SMS')
      }
    } catch (err) {
      setError(err.message || 'Failed to send SMS')
    }
    setSendingSms(false)
  }

  async function handleSendCustomSms() {
    if (!customMessage.trim()) return
    setSendingCustomSms(true)
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-custom-sms', {
        body: { eventId: id, message: customMessage.trim() },
      })
      if (fnErr) throw fnErr
      if (data?.ok) {
        setCopyToast(`Message sent to ${data.sent} participant${data.sent !== 1 ? 's' : ''}`)
        setTimeout(() => setCopyToast(''), 3000)
        setCustomMessage('')
      } else {
        setError(data?.error || 'Failed to send message')
      }
    } catch (err) {
      setError(err.message || 'Failed to send message')
    }
    setSendingCustomSms(false)
  }

  async function handleSendFeedbackSms() {
    setSendingFeedback(true)
    setError('')
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('send-feedback-sms', {
        body: { eventId: id },
      })
      if (fnErr) throw fnErr
      if (data?.ok) {
        await loadData()
      } else {
        setError(data?.error || 'Failed to send feedback SMS')
      }
    } catch (err) {
      setError(err.message || 'Failed to send feedback SMS')
    }
    setSendingFeedback(false)
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

  // --- Rebalance: ensure every participant has exactly config.mission_count missions ---
  // Fills empty slots from pool, trims excess back to pool
  function rebalanceAssignments(assignments, protectedMissionIds = []) {
    const targetCount = config?.mission_count || 3
    // Build set of all currently assigned mission IDs
    const allAssigned = new Set()
    assignments.forEach(p => p.missions.forEach(pm => {
      if (pm?.mission_id) allAssigned.add(pm.mission_id)
    }))
    // Available pool missions not yet assigned to anyone (prefer unassigned)
    const available = missionPool
      .filter(m => !protectedMissionIds.includes(m.id))
      .sort((a, b) => {
        const aUsed = allAssigned.has(a.id) ? 1 : 0
        const bUsed = allAssigned.has(b.id) ? 1 : 0
        return aUsed - bUsed
      })
    let availIdx = 0

    return assignments.map(p => {
      let missions = [...p.missions]

      if (missions.length > targetCount) {
        // Trim excess — remove non-completed, non-protected slots from the end
        const keep = []
        const extras = []
        missions.forEach(pm => {
          if (keep.length < targetCount) {
            keep.push(pm)
          } else if (pm.completed || protectedMissionIds.includes(pm.mission_id)) {
            // Protected or completed — swap with a non-protected from keep
            const swapIdx = keep.findIndex(k => !k.completed && !protectedMissionIds.includes(k.mission_id))
            if (swapIdx >= 0) {
              extras.push(keep[swapIdx])
              keep[swapIdx] = pm
            } else {
              extras.push(pm)
            }
          } else {
            extras.push(pm)
          }
        })
        missions = keep
      }

      if (missions.length < targetCount) {
        // Fill empty slots — first fill any null mission_id slots, then add new ones
        missions = missions.map(pm => {
          if (!pm.mission_id && availIdx < available.length) {
            const m = available[availIdx++]
            return { ...pm, mission_id: m.id, missions: { text: m.text } }
          }
          return pm
        })
        // If still short, add new slot entries
        while (missions.length < targetCount && availIdx < available.length) {
          const m = available[availIdx++]
          missions.push({
            id: `new-${Date.now()}-${Math.random()}`,
            mission_id: m.id,
            missions: { text: m.text },
            completed: false,
            completed_at: null,
            _originalMissionId: null,
          })
        }
        // If pool is exhausted, pad with empty slots
        while (missions.length < targetCount) {
          missions.push({
            id: `empty-${Date.now()}-${Math.random()}`,
            mission_id: null,
            missions: null,
            completed: false,
            completed_at: null,
            _originalMissionId: null,
          })
        }
      }

      return { ...p, missions }
    })
  }

  // --- Drag and Drop handlers ---
  function handleDragStartFromParticipant(e, participantIdx, missionIdx, mission) {
    setDragSource({ type: 'participant', participantIdx, missionIdx, mission })
    e.dataTransfer.effectAllowed = 'copyMove'
    e.dataTransfer.setData('text/plain', mission?.missions?.text || '')
  }

  function handleDragStartFromPool(e, mission) {
    setDragSource({ type: 'pool', mission })
    e.dataTransfer.effectAllowed = 'copyMove'
    e.dataTransfer.setData('text/plain', mission.text)
  }

  function handleDragLeave(e) {
    // Only clear if we're actually leaving the element (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null)
    }
  }

  // Drop a mission onto a specific slot of a participant
  function handleDropOnSlot(e, targetPIdx, targetMIdx) {
    e.preventDefault()
    e.stopPropagation()
    setDropTarget(null)
    const source = dragSourceRef.current
    if (!source) return

    const base = ensureLocalAssignments()

    // Never allow replacing a completed mission slot during a live event
    if (isLive && base[targetPIdx]?.missions[targetMIdx]?.completed) return

    if (source.type === 'pool') {
      // Dropping from pool onto a specific slot — replace that slot
      const next = base.map((p, pIdx) => {
        if (pIdx !== targetPIdx) return p
        return {
          ...p,
          missions: p.missions.map((pm, mIdx) => {
            if (mIdx !== targetMIdx) return pm
            return { ...pm, mission_id: source.mission.id, missions: { text: source.mission.text } }
          })
        }
      })
      setLocalAssignments(next)
      setHasUnsavedChanges(true)
    } else if (source.type === 'participant') {
      const srcPIdx = source.participantIdx
      const srcMIdx = source.missionIdx

      if (srcPIdx === targetPIdx && srcMIdx === targetMIdx) {
        // Dropped on itself — no-op
        setDragSource(null)
        return
      }

      if (srcPIdx === targetPIdx) {
        // Same participant — swap the two slots
        const srcMission = base[srcPIdx].missions[srcMIdx]
        const tgtMission = base[targetPIdx].missions[targetMIdx]
        const next = base.map((p, pIdx) => {
          if (pIdx !== srcPIdx) return p
          return {
            ...p,
            missions: p.missions.map((pm, mIdx) => {
              if (mIdx === srcMIdx) return { ...pm, mission_id: tgtMission.mission_id, missions: tgtMission.missions }
              if (mIdx === targetMIdx) return { ...pm, mission_id: srcMission.mission_id, missions: srcMission.missions }
              return pm
            })
          }
        })
        setLocalAssignments(next)
        setHasUnsavedChanges(true)
      } else {
        // Cross-player: replace target slot with source mission, clear source slot
        const srcMission = base[srcPIdx].missions[srcMIdx]
        const next = base.map((p, pIdx) => {
          if (pIdx === srcPIdx) {
            return {
              ...p,
              missions: p.missions.map((pm, mIdx) => {
                if (mIdx === srcMIdx) return { ...pm, mission_id: null, missions: null }
                return pm
              })
            }
          }
          if (pIdx === targetPIdx) {
            return {
              ...p,
              missions: p.missions.map((pm, mIdx) => {
                if (mIdx === targetMIdx) return { ...pm, mission_id: srcMission.mission_id, missions: srcMission.missions }
                return pm
              })
            }
          }
          return p
        })
        // Rebalance so source player gets a new mission from pool
        const rebalanced = rebalanceAssignments(next, [srcMission.mission_id])
        setLocalAssignments(rebalanced)
        setHasUnsavedChanges(true)
      }
    }

    setDragSource(null)
  }

  // Drop a mission onto a participant card (header area) — moves mission to that player
  function handleDropOnPlayerCard(e, targetPIdx) {
    e.preventDefault()
    setDropTarget(null)
    const source = dragSourceRef.current
    if (!source) return

    const base = ensureLocalAssignments()

    if (source.type === 'pool') {
      // Find first empty slot or first non-completed slot to replace
      const targetMissions = base[targetPIdx].missions
      let slotIdx = targetMissions.findIndex(pm => !pm?.mission_id)
      if (slotIdx === -1) {
        slotIdx = targetMissions.findIndex(pm => !pm?.completed)
      }
      if (slotIdx === -1) slotIdx = 0

      const next = base.map((p, pIdx) => {
        if (pIdx !== targetPIdx) return p
        return {
          ...p,
          missions: p.missions.map((pm, mIdx) => {
            if (mIdx !== slotIdx) return pm
            return { ...pm, mission_id: source.mission.id, missions: { text: source.mission.text } }
          })
        }
      })
      setLocalAssignments(next)
      setHasUnsavedChanges(true)
    } else if (source.type === 'participant') {
      const srcPIdx = source.participantIdx
      if (srcPIdx === targetPIdx) {
        setDragSource(null)
        return // Dropped on same player — no-op
      }

      const srcMission = base[srcPIdx].missions[source.missionIdx]
      if (!srcMission?.mission_id) {
        setDragSource(null)
        return
      }

      // Move: add to target, remove from source
      // Target gets the mission added (as extra), source loses it
      const next = base.map((p, pIdx) => {
        if (pIdx === srcPIdx) {
          return {
            ...p,
            missions: p.missions.map((pm, mIdx) => {
              if (mIdx === source.missionIdx) return { ...pm, mission_id: null, missions: null }
              return pm
            })
          }
        }
        if (pIdx === targetPIdx) {
          // Add the mission as a new entry
          return {
            ...p,
            missions: [
              ...p.missions,
              {
                id: `moved-${Date.now()}`,
                mission_id: srcMission.mission_id,
                missions: srcMission.missions,
                completed: false,
                completed_at: null,
                _originalMissionId: null,
              }
            ]
          }
        }
        return p
      })

      // Rebalance: target has too many, source has too few — fix both
      const rebalanced = rebalanceAssignments(next, [srcMission.mission_id])
      setLocalAssignments(rebalanced)
      setHasUnsavedChanges(true)
    }

    setDragSource(null)
  }

  function handleDropOnPool(e) {
    e.preventDefault()
    setDropTarget(null)
    const source = dragSourceRef.current
    if (!source || source.type !== 'participant') return

    // Unassign the mission (move it back to the pool), then rebalance
    const base = ensureLocalAssignments()
    const next = base.map((p, pIdx) => {
      if (pIdx !== source.participantIdx) return p
      return {
        ...p,
        missions: p.missions.map((pm, mIdx) => {
          if (mIdx !== source.missionIdx) return pm
          return { ...pm, mission_id: null, missions: null }
        })
      }
    })
    const rebalanced = rebalanceAssignments(next)
    setLocalAssignments(rebalanced)
    setHasUnsavedChanges(true)
    setDragSource(null)
  }

  function handleDragEnd() {
    setDragSource(null)
    setDropTarget(null)
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
    if (!hasUnsavedChanges) return
    // Check for empty slots
    const empty = localAssignments?.reduce((count, p) =>
      count + p.missions.filter(pm => !pm?.mission_id).length, 0
    ) ?? 0
    if (empty > 0) {
      if (!confirm(`${empty} mission slot${empty !== 1 ? 's are' : ' is'} still empty (mission pool may be exhausted). Save anyway? Empty slots will be skipped.`)) return
    }

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
      .select('id, category_id')
      .eq('active', true)

    if (eventConfig.tag_filters?.length > 0) {
      query = query.in('category_id', eventConfig.tag_filters)
    }

    const { data: missions } = await query
    if (!missions || missions.length === 0) return

    // Get existing assignment counts across the event for global balance
    const { data: allEventParticipants } = await supabase
      .from('participants')
      .select('id')
      .eq('event_id', id)
      .eq('is_active', true)

    const eventParticipantIds = (allEventParticipants || []).map((p) => p.id)
    const assignmentCounts = {}
    missions.forEach((m) => (assignmentCounts[m.id] = 0))

    if (eventParticipantIds.length > 0) {
      const { data: existingAssignments } = await supabase
        .from('participant_missions')
        .select('mission_id')
        .in('participant_id', eventParticipantIds)

      if (existingAssignments) {
        existingAssignments.forEach((a) => {
          if (assignmentCounts[a.mission_id] !== undefined) {
            assignmentCounts[a.mission_id]++
          }
        })
      }
    }

    const mode = eventConfig.allocation_mode || 'balanced'
    const selected = selectMissionsForParticipant(
      mode,
      missions,
      eventConfig.mission_count,
      assignmentCounts,
      {}, // late joiner has no prior missions on this participant
      new Set()
    )

    const rows = selected.map((m) => ({
      participant_id: participant.id,
      mission_id: m.id,
    }))

    if (rows.length > 0) {
      const { error: insertErr } = await supabase.from('participant_missions').insert(rows)
      if (insertErr) throw insertErr
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

  // --- Auth loading state ---
  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="pq-spinner" />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // --- Data loading state ---
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="pq-spinner" />
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)' }}>Loading event...</p>
        </div>
      </div>
    )
  }

  // --- Error state (no event) ---
  if (error && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <p style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-body)' }}>{error}</p>
          <button
            onClick={() => navigate('/organizer')}
            className="pq-btn pq-btn-ghost"
            style={{ color: 'var(--color-primary)' }}
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

  const APP_URL = (import.meta.env.VITE_APP_URL || window.location.origin).trim()
  const organizerFirstName = user?.user_metadata?.full_name?.split(' ')[0] || user?.user_metadata?.name?.split(' ')[0] || null
  const inviteLink = organizerFirstName
    ? `${APP_URL}/register/${event.event_code.trim()}?from=${encodeURIComponent(organizerFirstName)}`
    : `${APP_URL}/register/${event.event_code.trim()}`

  const tabItems = [
    { key: 'participants', label: 'Participants' },
    { key: 'missions', label: 'Missions' },
    { key: 'feed', label: 'Feed' },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      <div className={`${activeTab === 'missions' ? 'max-w-5xl' : 'max-w-3xl'} mx-auto px-6 py-8`} style={{ transition: 'var(--transition-base)' }}>

        {/* Back nav */}
        <button
          onClick={() => navigate('/organizer')}
          className="pq-btn pq-btn-ghost mb-6"
          style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: '0.25rem 0' }}
        >
          &larr; Dashboard
        </button>

        {/* Event Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-in">
          <div>
            <h1
              className="mb-2"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'var(--color-text)',
                lineHeight: 1.2,
              }}
            >
              {event.name}
            </h1>
            <div className="flex items-center gap-3">
              {isLive && (
                <span className="pq-badge pq-badge-success flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full animate-pulse"
                    style={{ background: 'var(--color-success)' }}
                  />
                  Live
                </span>
              )}
              {isUpcoming && (
                <span className="pq-badge pq-badge-warning">Upcoming</span>
              )}
              {isEnded && (
                <span className="pq-badge pq-badge-muted">
                  Ended &middot;{' '}
                  {new Date(event.start_time).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
              {!isEnded && timeRemaining && (
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
                  {timeRemaining}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEnded && (
              <button
                onClick={() => navigate(`/organizer/new?edit=${id}`)}
                className="pq-btn pq-btn-secondary"
              >
                Edit
              </button>
            )}
            {!isEnded && (
              <button
                onClick={handleEndEvent}
                disabled={ending}
                className="pq-btn pq-btn-danger"
              >
                {ending ? 'Ending...' : 'End Event'}
              </button>
            )}
          </div>
        </div>

        {/* Event Code + Invite */}
        <div
          className="pq-card mb-6 animate-slide-up"
          style={{
            background: 'var(--color-primary-subtle)',
            borderColor: 'var(--color-primary-light)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Event Code
              </p>
              <p style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                letterSpacing: '0.15em',
              }}>
                {event.event_code}
              </p>
            </div>
            <button
              onClick={() => copyWithToast(event.event_code, 'Event code copied!', 'eventCode')}
              className="pq-btn pq-btn-ghost"
              style={{ color: 'var(--color-primary)' }}
            >
              {copiedKey === 'eventCode' ? 'Copied!' : 'Copy Code'}
            </button>
          </div>

          {/* Invite link section */}
          {!isEnded && (
            <div className="pt-4" style={{ borderTop: '1px solid var(--color-primary-light)' }}>
              <p style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-body)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Invite Link
              </p>
              <div className="flex items-center gap-3">
                <p
                  className="flex-1 truncate"
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.875rem',
                    color: 'var(--color-primary)',
                    background: 'var(--color-surface)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {inviteLink}
                </p>
                <button
                  onClick={() => copyWithToast(inviteLink, 'Invite link copied!', 'inviteLink')}
                  className="pq-btn pq-btn-ghost shrink-0"
                  style={{ color: 'var(--color-primary)', fontSize: '0.8125rem' }}
                >
                  {copiedKey === 'inviteLink' ? 'Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => setShowQR(!showQR)}
                  className="pq-btn pq-btn-ghost shrink-0"
                  style={{ color: 'var(--color-primary)', fontSize: '0.8125rem' }}
                >
                  {showQR ? 'Hide QR' : 'QR Code'}
                </button>
              </div>
              {showQR && (
                <div
                  className="mt-4 p-6 flex flex-col items-center animate-scale-in"
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteLink)}`}
                    alt="QR Code"
                    width={200}
                    height={200}
                  />
                  <p className="mt-3" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
                    Scan to register
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Play as Participant */}
        {organizerAccessCode && (
          <button
            onClick={() => navigate(`/play/${organizerAccessCode}`)}
            className="pq-btn pq-btn-secondary w-full mb-6"
          >
            Play as Participant
          </button>
        )}

        {/* Message all players */}
        {!isEnded && activeParticipants.some((p) => p.phone) && (
          <div className="pq-card mb-6 animate-fade-in">
            <h3
              className="mb-3"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-text)',
              }}
            >
              Message All Players
            </h3>
            <p className="mb-3" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
              {(() => {
                const count = activeParticipants.filter((p) => p.phone).length
                return `Sends to ${count} participant${count !== 1 ? 's' : ''} with phone numbers`
              })()}
            </p>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. New missions just dropped — check your page! or Dinner buffet is now open, come get food!"
              className="pq-input w-full mb-3"
              rows={3}
              maxLength={320}
              style={{ resize: 'vertical', fontFamily: 'var(--font-body)', fontSize: '0.875rem' }}
            />
            <div className="flex items-center justify-between gap-3">
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-body)' }}>
                {customMessage.length} / 320
              </span>
              <button
                onClick={handleSendCustomSms}
                disabled={sendingCustomSms || !customMessage.trim()}
                className="pq-btn pq-btn-primary"
                style={{ fontSize: '0.8125rem' }}
              >
                {sendingCustomSms ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </div>
        )}

        {/* Post-event summary */}
        {isEnded && (
          <div className="pq-card mb-6 animate-fade-in">
            <h3
              className="mb-4"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-text)',
              }}
            >
              Event Summary
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Total completions', value: totalCompletions },
                { label: 'Avg per person', value: avgCompletions },
                { label: 'Participation rate', value: `${participationRate}%` },
                { label: 'Participants joined', value: `${joinedCount} / ${activeParticipants.length}` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-4"
                  style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)', marginBottom: '0.25rem' }}>
                    {stat.label}
                  </p>
                  <p style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                  }}>
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
            {mostCompletedMission && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
                  Most completed mission
                </p>
                <p className="mt-1" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
                  "{mostCompletedMission.text}" ({mostCompletedMission.count} completions)
                </p>
              </div>
            )}
          </div>
        )}

        {/* Feedback collection banner */}
        {isEnded && (
          <div className="pq-card mb-6 animate-fade-in">
            <h3
              className="mb-3"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: 'var(--color-text)',
              }}
            >
              Collect Feedback
            </h3>

            {event.feedback_sent_at ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
                Feedback requests sent on{' '}
                {new Date(event.feedback_sent_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
                  {(() => {
                    const count = activeParticipants.filter((p) => p.phone).length
                    return `${count} participant${count !== 1 ? 's' : ''} with phone numbers`
                  })()}
                </p>
                <button
                  onClick={handleSendFeedbackSms}
                  disabled={sendingFeedback || activeParticipants.filter((p) => p.phone).length === 0}
                  className="pq-btn pq-btn-primary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  {sendingFeedback ? 'Sending...' : 'Send Feedback Requests'}
                </button>
              </div>
            )}

            {/* In-room QR code */}
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border-light)' }}>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)', marginBottom: '0.75rem' }}>
                No phone? Share this link or QR code in the room:
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <p
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.8125rem',
                    color: 'var(--color-primary)',
                    background: 'var(--color-surface)',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    wordBreak: 'break-all',
                  }}
                >
                  {`${APP_URL}/feedback/${event.event_code}`}
                </p>
              </div>
              <div
                className="mt-4 p-4 flex flex-col items-center animate-scale-in"
                style={{
                  background: 'var(--color-surface)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'inline-flex',
                }}
              >
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(`${APP_URL}/feedback/${event.event_code}`)}`}
                  alt="Feedback QR Code"
                  width={160}
                  height={160}
                  style={{ borderRadius: 'var(--radius-md)' }}
                />
                <p className="mt-2" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
                  Scan to give feedback
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard toggle */}
        {(isEnded || isLive) && (
          <div className="mb-6">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="pq-btn pq-btn-ghost mb-3"
              style={{ color: 'var(--color-primary)', fontSize: '0.875rem' }}
            >
              {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
            </button>
            {showLeaderboard && (
              <div className="pq-card animate-scale-in">
                <Leaderboard eventId={event.id} anonymity={event.anonymity_enabled} />
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div
          className="flex mb-6"
          style={{ borderBottom: '2px solid var(--color-border-light)' }}
        >
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-3 text-center"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: activeTab === tab.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: '-2px',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'var(--transition-fast)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Participants tab */}
        {activeTab === 'participants' && (
          <div className="pq-card mb-6 animate-fade-in" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--color-border-light)' }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--color-text)',
                }}
              >
                Participants ({activeParticipants.length})
              </h3>
              <div className="flex items-center gap-2">
                {!isEnded && activeParticipants.some(p => p.phone && !p.sms_sent_at) && (
                  <button
                    onClick={handleSendSmsBlast}
                    disabled={sendingSms}
                    className="pq-btn pq-btn-primary"
                    style={{ fontSize: '0.8125rem', padding: '0.375rem 0.75rem' }}
                  >
                    {sendingSms ? 'Sending...' : 'Send SMS'}
                  </button>
                )}
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
                    className="pq-btn pq-btn-ghost"
                    style={{ color: 'var(--color-primary)', fontSize: '0.8125rem' }}
                  >
                    Copy All Codes
                  </button>
                )}
              </div>
            </div>

            {activeParticipants.length === 0 ? (
              <p
                className="px-5 py-8 text-center"
                style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}
              >
                No participants yet.
              </p>
            ) : (
              <div>
                {/* Table header */}
                <div
                  className="grid grid-cols-12 px-5 py-2.5 items-center"
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    color: 'var(--color-text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily: 'var(--font-body)',
                    background: 'var(--color-surface)',
                  }}
                >
                  <div className="col-span-3">Name</div>
                  <div className="col-span-2">Access Code</div>
                  <div className="col-span-2">Phone</div>
                  <div className="col-span-1 text-center">Source</div>
                  <div className="col-span-1 text-center">Joined</div>
                  <div className="col-span-2 text-right">Progress</div>
                  <div className="col-span-1" />
                </div>

                {activeParticipants.map((p, idx) => {
                  const isEditing = editingParticipantId === p.id
                  return (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 px-5 py-3 items-center"
                    style={{
                      borderBottom: '1px solid var(--color-border-light)',
                      transition: 'var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="col-span-3 flex items-center gap-3">
                      <div
                        className="pq-avatar pq-avatar-sm"
                        style={{ background: getAvatarColor(p.name) }}
                      >
                        {getInitials(p.name)}
                      </div>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="pq-input"
                          style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditParticipant(p.id)
                            if (e.key === 'Escape') cancelEditParticipant()
                          }}
                          autoFocus
                        />
                      ) : (
                        <span
                          className="truncate flex items-center gap-1"
                          style={{
                            color: 'var(--color-text)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', minWidth: 18 }}>
                            {idx + 1}.
                          </span>
                          {p.name}
                        </span>
                      )}
                    </div>
                    <div className="col-span-2">
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-secondary)',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {p.access_code}
                      </span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1">
                      {isEditing ? (
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="pq-input"
                          style={{ fontSize: '0.8125rem', padding: '0.25rem 0.5rem', width: '100%' }}
                          placeholder="Phone (optional)"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditParticipant(p.id)
                            if (e.key === 'Escape') cancelEditParticipant()
                          }}
                        />
                      ) : (
                        <>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                            {p.phone ? `***-${p.phone.slice(-4)}` : '\u2014'}
                          </span>
                          {p.sms_sent_at && (
                            <span className="pq-badge pq-badge-success" style={{ fontSize: '0.625rem', padding: '0.125rem 0.375rem' }}>
                              SMS
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div className="col-span-1 text-center">
                      <span className={`pq-badge ${p.source === 'self' ? 'pq-badge-primary' : 'pq-badge-muted'}`}>
                        {p.source === 'self' ? 'link' : 'add'}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      {p.joined_at ? (
                        <span className="pq-badge pq-badge-success">Yes</span>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>&mdash;</span>
                      )}
                    </div>
                    <div className="col-span-2 text-right" style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
                      {p.completed} / {p.total}
                    </div>
                    <div className="col-span-1 text-right flex items-center justify-end gap-1">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEditParticipant(p.id)}
                            disabled={savingEdit}
                            className="pq-btn pq-btn-ghost"
                            style={{ color: 'var(--color-success)', padding: '0.125rem 0.375rem', fontSize: '0.8125rem', fontWeight: 600 }}
                            title="Save"
                          >
                            {savingEdit ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={cancelEditParticipant}
                            disabled={savingEdit}
                            className="pq-btn pq-btn-ghost"
                            style={{ color: 'var(--color-text-muted)', padding: '0.125rem 0.375rem', fontSize: '0.8125rem' }}
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          {isUpcoming && (
                            <button
                              onClick={() => startEditParticipant(p)}
                              className="pq-btn pq-btn-ghost"
                              style={{
                                color: 'var(--color-text-muted)',
                                padding: '0.125rem 0.375rem',
                                fontSize: '0.875rem',
                                lineHeight: 1,
                              }}
                              title="Edit name & phone"
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                            >
                              ✎
                            </button>
                          )}
                          {!isEnded && (
                            <button
                              onClick={() => handleDeactivateParticipant(p.id)}
                              className="pq-btn pq-btn-ghost"
                              style={{
                                color: 'var(--color-text-muted)',
                                padding: '0.125rem 0.375rem',
                                fontSize: '1rem',
                                lineHeight: 1,
                              }}
                              title="Remove participant"
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-danger)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
                            >
                              &times;
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}

            {/* Add participant inline */}
            {!isEnded && (
              <div className="px-5 py-4" style={{ borderTop: '1px solid var(--color-border-light)' }}>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    placeholder="Name"
                    className="pq-input flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddParticipant()
                    }}
                  />
                  <input
                    type="tel"
                    value={newParticipantPhone}
                    onChange={(e) => setNewParticipantPhone(e.target.value)}
                    placeholder="Phone (optional)"
                    className="pq-input"
                    style={{ width: '160px' }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddParticipant()
                    }}
                  />
                  <button
                    onClick={handleAddParticipant}
                    disabled={addingParticipant || !newParticipantName.trim()}
                    className="pq-btn pq-btn-primary"
                  >
                    {addingParticipant ? '...' : 'Add'}
                  </button>
                </div>
                <p className="mt-2" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
                  Or share the{' '}
                  <button
                    onClick={() => { setActiveTab('participants'); copyWithToast(inviteLink, 'Invite link copied!', 'inviteLinkInline') }}
                    className="pq-btn pq-btn-ghost"
                    style={{ color: 'var(--color-primary)', fontWeight: 600, padding: 0, display: 'inline', fontSize: 'inherit' }}
                  >
                    {copiedKey === 'inviteLinkInline' ? 'Copied!' : 'invite link'}
                  </button>{' '}
                  and let participants register themselves.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Missions tab */}
        {activeTab === 'missions' && (
          <div className="mb-6 animate-fade-in">
            {/* Save bar */}
            {hasUnsavedChanges && !isEnded && (
              <div
                className="pq-card mb-4 flex items-center justify-between"
                style={{
                  background: 'var(--color-warning-light)',
                  borderColor: 'var(--color-warning)',
                }}
              >
                <div>
                  <span style={{ color: 'var(--color-text)', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                    Unsaved changes
                  </span>
                  {emptySlots > 0 && (
                    <span className="ml-2" style={{ color: 'var(--color-text-secondary)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
                      ({emptySlots} empty {emptySlots === 1 ? 'slot' : 'slots'} -- fill before saving)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCancelEdits} className="pq-btn pq-btn-ghost">
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAssignments}
                    disabled={!canSave || saving}
                    className="pq-btn pq-btn-primary"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Select mode banner */}
            {selectTarget && (
              <div
                className="pq-card mb-4 flex items-center justify-between"
                style={{
                  background: 'var(--color-primary-subtle)',
                  borderColor: 'var(--color-primary-light)',
                }}
              >
                <span style={{ color: 'var(--color-primary)', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'var(--font-body)' }}>
                  Select a mission from the pool to assign
                </span>
                <button
                  onClick={() => setSelectTarget(null)}
                  className="pq-btn pq-btn-ghost"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="flex flex-col lg:flex-row gap-5">
              {/* Participant assignments */}
              <div className="flex-1 min-w-0 flex flex-col gap-4">
                {(!isEnded && !isLive && (localAssignments || missionAssignments).length === 0) && (
                  <p
                    className="text-center py-8"
                    style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}
                  >
                    Mission assignments will appear here after the event is created.
                  </p>
                )}
                {(localAssignments || missionAssignments).map((participant, pIdx) => {
                  const isCardDropTarget = dropTarget?.type === 'playerCard' && dropTarget?.participantIdx === pIdx
                  return (
                  <div
                    key={participant.id}
                    className="pq-card"
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      border: isCardDropTarget ? '2px dashed var(--color-primary)' : undefined,
                      transition: 'var(--transition-fast)',
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                      // Only show card-level highlight if dragging from a different player or pool
                      const src = dragSourceRef.current
                      if (src?.type === 'pool' || (src?.type === 'participant' && src?.participantIdx !== pIdx)) {
                        setDropTarget({ type: 'playerCard', participantIdx: pIdx })
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        setDropTarget(null)
                      }
                    }}
                    onDrop={(e) => handleDropOnPlayerCard(e, pIdx)}
                  >
                    <div
                      className="px-4 py-3 flex items-center gap-3"
                      style={{
                        borderBottom: '1px solid var(--color-border-light)',
                        background: isCardDropTarget ? 'var(--color-primary-subtle)' : 'transparent',
                        transition: 'var(--transition-fast)',
                      }}
                    >
                      <div
                        className="pq-avatar pq-avatar-sm"
                        style={{ background: getAvatarColor(participant.name) }}
                      >
                        {getInitials(participant.name)}
                      </div>
                      <h4
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '0.9375rem',
                          fontWeight: 700,
                          color: 'var(--color-text)',
                        }}
                      >
                        {participant.name}
                      </h4>
                      {isCardDropTarget && (
                        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                          Drop to move here
                        </span>
                      )}
                    </div>
                    <div>
                      {participant.missions.map((pm, mIdx) => {
                        const isSelected = selectTarget?.participantIdx === pIdx && selectTarget?.missionIdx === mIdx
                        const isDropHere = dropTarget?.type === 'participant' && dropTarget?.participantIdx === pIdx && dropTarget?.missionIdx === mIdx
                        const canDrag = (isUpcoming || (isLive && !pm?.completed)) && pm?.mission_id
                        return (
                          <div
                            key={pm?.id || mIdx}
                            className="px-4 py-2.5 flex items-center justify-between"
                            draggable={canDrag && !isEnded}
                            onDragStart={canDrag ? (e) => handleDragStartFromParticipant(e, pIdx, mIdx, pm) : undefined}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'move'; setDropTarget({ type: 'participant', participantIdx: pIdx, missionIdx: mIdx }) }}
                            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropTarget(null) }}
                            onDrop={(e) => handleDropOnSlot(e, pIdx, mIdx)}
                            style={{
                              borderBottom: '1px solid var(--color-border-light)',
                              background: isDropHere ? 'var(--color-primary-subtle)' : isSelected ? 'var(--color-primary-subtle)' : 'transparent',
                              borderLeft: isDropHere ? '3px solid var(--color-primary)' : isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                              transition: 'var(--transition-fast)',
                              cursor: canDrag && !isEnded ? 'grab' : 'default',
                              opacity: dragSource?.type === 'participant' && dragSource?.participantIdx === pIdx && dragSource?.missionIdx === mIdx ? 0.4 : 1,
                            }}
                          >
                            {pm?.mission_id ? (
                              <>
                                {canDrag && !isEnded && (
                                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginRight: '0.5rem' }}>
                                    <circle cx="6" cy="4" r="1.5" fill="currentColor" />
                                    <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                                    <circle cx="6" cy="8" r="1.5" fill="currentColor" />
                                    <circle cx="10" cy="8" r="1.5" fill="currentColor" />
                                    <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                                    <circle cx="10" cy="12" r="1.5" fill="currentColor" />
                                  </svg>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p
                                    style={{
                                      fontSize: '0.875rem',
                                      fontFamily: 'var(--font-body)',
                                      color: pm.completed ? 'var(--color-success)' : 'var(--color-text-secondary)',
                                      textDecoration: pm.completed ? 'line-through' : 'none',
                                    }}
                                  >
                                    {pm.missions?.text || 'Unknown mission'}
                                  </p>
                                  {pm.missions?.categories?.name && (
                                    <span className="pq-badge pq-badge-muted" style={{ fontSize: '0.65rem', padding: '1px 6px', marginTop: '2px', display: 'inline-block' }}>
                                      {pm.missions.categories.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 ml-3">
                                  {pm.completed && (
                                    <span className="pq-badge pq-badge-success">Done</span>
                                  )}
                                  {(isUpcoming || (isLive && !pm.completed)) && (
                                    <>
                                      <button
                                        onClick={() => handleSelectForSwap(pIdx, mIdx)}
                                        className="pq-btn pq-btn-ghost"
                                        style={{
                                          color: 'var(--color-primary)',
                                          fontSize: '0.8125rem',
                                          fontWeight: 600,
                                          padding: '0.125rem 0.5rem',
                                        }}
                                      >
                                        {isSelected ? 'Selecting...' : 'Swap'}
                                      </button>
                                      <button
                                        onClick={() => handleUnassign(pIdx, mIdx)}
                                        className="pq-btn pq-btn-ghost"
                                        style={{
                                          color: 'var(--color-danger)',
                                          fontSize: '0.8125rem',
                                          fontWeight: 600,
                                          padding: '0.125rem 0.5rem',
                                        }}
                                      >
                                        Unassign
                                      </button>
                                    </>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="flex-1 flex items-center justify-between">
                                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', fontStyle: 'italic', fontFamily: 'var(--font-body)' }}>
                                  {isDropHere ? 'Drop here to assign' : 'Empty slot'}
                                </span>
                                {(isUpcoming || isLive) && (
                                  <button
                                    onClick={() => handleSelectForSwap(pIdx, mIdx)}
                                    className="pq-btn pq-btn-ghost"
                                    style={{
                                      color: 'var(--color-primary)',
                                      fontSize: '0.8125rem',
                                      fontWeight: 600,
                                      padding: '0.125rem 0.5rem',
                                    }}
                                  >
                                    {isSelected ? 'Selecting...' : 'Assign'}
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {participant.missions.length === 0 && (
                        <p className="px-4 py-4" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
                          No missions assigned
                        </p>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>

              {/* Mission Pool Sidebar */}
              <div className="w-full lg:w-80 shrink-0">
                <div
                  className="lg:sticky lg:top-4 pq-card"
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    border: dropTarget?.type === 'pool' ? '2px dashed var(--color-primary)' : undefined,
                  }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget({ type: 'pool' }) }}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDropOnPool}
                >
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <h3
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '0.9375rem',
                        fontWeight: 700,
                        color: 'var(--color-text)',
                      }}
                    >
                      Mission Bank ({poolWithCounts.length})
                    </h3>
                    <p className="mt-1" style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-body)' }}>
                      {dragSource?.type === 'participant' ? 'Drop here to unassign' : 'Drag missions to participants, or click to assign'}
                    </p>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto">
                    {poolWithCounts.map((mission) => (
                      <div
                        key={mission.id}
                        draggable={!isEnded}
                        onDragStart={(e) => handleDragStartFromPool(e, mission)}
                        onDragEnd={handleDragEnd}
                        onClick={() => selectTarget && handlePoolMissionClick(mission)}
                        className="px-4 py-2.5 flex items-start justify-between gap-3"
                        style={{
                          borderBottom: '1px solid var(--color-border-light)',
                          cursor: !isEnded ? 'grab' : selectTarget ? 'pointer' : 'default',
                          transition: 'var(--transition-fast)',
                        }}
                        onMouseEnter={(e) => {
                          if (selectTarget || !isEnded) e.currentTarget.style.background = 'var(--color-primary-subtle)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                        }}
                      >
                        {!isEnded && (
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-text-muted)', flexShrink: 0, marginTop: '3px' }}>
                            <circle cx="6" cy="4" r="1.5" fill="currentColor" />
                            <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                            <circle cx="6" cy="8" r="1.5" fill="currentColor" />
                            <circle cx="10" cy="8" r="1.5" fill="currentColor" />
                            <circle cx="6" cy="12" r="1.5" fill="currentColor" />
                            <circle cx="10" cy="12" r="1.5" fill="currentColor" />
                          </svg>
                        )}
                        <div className="flex-1">
                          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)' }}>
                            {mission.text}
                          </p>
                          {mission.categories?.name && (
                            <span className="pq-badge pq-badge-muted" style={{ fontSize: '0.65rem', padding: '1px 6px', marginTop: '2px', display: 'inline-block' }}>
                              {mission.categories.name}
                            </span>
                          )}
                        </div>
                        <span
                          className="shrink-0 px-1.5 py-0.5"
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 'var(--radius-sm)',
                            background: mission.assignCount === 0 ? 'var(--color-surface)' : 'var(--color-success-light)',
                            color: mission.assignCount === 0 ? 'var(--color-text-muted)' : 'var(--color-success)',
                          }}
                        >
                          {mission.assignCount}
                        </span>
                      </div>
                    ))}
                    {poolWithCounts.length === 0 && (
                      <p className="px-4 py-8 text-center" style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', fontFamily: 'var(--font-body)' }}>
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
          <div className="mb-6 animate-fade-in">
            <ActivityFeed
              eventId={event.id}
              feedMode={event.feed_mode || 'secret'}
              showPhotos={event.feed_photos_enabled !== false}
              showComments={event.feed_comments_enabled !== false}
              showReactions={event.feed_reactions_enabled !== false}
              showInteractiveComments={event.feed_interactive_comments_enabled === true}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleClone}
            disabled={cloning}
            className="pq-btn pq-btn-primary flex-1 py-3"
          >
            {cloning ? 'Cloning...' : 'Clone Event'}
          </button>
          <button
            onClick={handleDeleteEvent}
            disabled={deleting}
            className="pq-btn pq-btn-danger py-3 px-6"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>

        {error && (
          <p className="mt-4" style={{ color: 'var(--color-danger)', fontSize: '0.875rem', fontFamily: 'var(--font-body)' }}>
            {error}
          </p>
        )}
      </div>

      {/* Copy toast */}
      {copyToast && (
        <div className="pq-toast">
          <div className="pq-toast-inner">
            {copyToast}
          </div>
        </div>
      )}
    </div>
  )
}

