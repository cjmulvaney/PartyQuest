/**
 * Shared event clone used by Dashboard.jsx and EventDetail.jsx.
 *
 * Copies full event settings + config, recreates the active participant
 * list with fresh access codes, and assigns missions to the copies.
 * Phones are intentionally not copied — a cloned event must never re-text
 * the original guest list.
 */

import { generateCode, selectMissionsForParticipant, fetchEligibleMissions } from './missions.js'

export async function cloneEvent(supabase, sourceEventId, organizerId) {
  // Fetch full settings from the DB — callers often hold partial rows
  const { data: source, error: sourceErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', sourceEventId)
    .single()
  if (sourceErr) throw sourceErr

  const { data: config } = await supabase
    .from('event_config')
    .select('*')
    .eq('event_id', sourceEventId)
    .maybeSingle()

  const start = new Date()
  start.setHours(19, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 0, 0, 0)

  const { data: newEvent, error: eventErr } = await supabase
    .from('events')
    .insert({
      organizer_id: organizerId,
      name: `${source.name} (Copy)`,
      event_type: source.event_type,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      event_code: generateCode(6),
      anonymity_enabled: source.anonymity_enabled,
      feed_mode: source.feed_mode,
      max_participants: source.max_participants,
      feed_photos_enabled: source.feed_photos_enabled,
      feed_comments_enabled: source.feed_comments_enabled,
      feed_reactions_enabled: source.feed_reactions_enabled,
      feed_interactive_comments_enabled: source.feed_interactive_comments_enabled,
      feed_hidden: source.feed_hidden,
      status: 'upcoming',
    })
    .select()
    .single()
  if (eventErr) throw eventErr

  if (config) {
    const { error: configErr } = await supabase.from('event_config').insert({
      event_id: newEvent.id,
      mission_count: config.mission_count,
      unlock_type: config.unlock_type,
      unlock_schedule: config.unlock_schedule,
      tag_filters: config.tag_filters,
      allocation_mode: config.allocation_mode,
    })
    if (configErr) throw configErr
  }

  // Copy the source event's custom missions to the clone (new rows, new
  // event_id) so the cloned pool is complete before assignment.
  const { data: sourceCustom } = await supabase
    .from('missions')
    .select('text, category_id')
    .eq('event_id', sourceEventId)
    .eq('active', true)
  if (sourceCustom && sourceCustom.length > 0) {
    const { error: customErr } = await supabase.from('missions').insert(
      sourceCustom.map((m) => ({
        text: m.text,
        category_id: m.category_id,
        event_id: newEvent.id,
        created_by: organizerId,
      }))
    )
    if (customErr) throw customErr
  }

  // Recreate active participants with fresh access codes
  const { data: sourceParticipants } = await supabase
    .from('participants')
    .select('name')
    .eq('event_id', sourceEventId)
    .eq('is_active', true)

  let newParticipants = []
  if (sourceParticipants && sourceParticipants.length > 0) {
    const rows = sourceParticipants.map((p) => ({
      event_id: newEvent.id,
      name: p.name,
      access_code: generateCode(6),
    }))
    const { data: inserted, error: partErr } = await supabase
      .from('participants')
      .insert(rows)
      .select('id')
    if (partErr) throw partErr
    newParticipants = inserted || []
  }

  if (newParticipants.length > 0 && config) {
    await assignMissionsToClones(supabase, newParticipants, config, newEvent.id)
  }

  return newEvent
}

async function assignMissionsToClones(supabase, participants, config, eventId) {
  // Library (tag-filtered, fallback to all) + the clone's own custom missions.
  const missions = await fetchEligibleMissions(supabase, {
    eventId,
    tagFilters: config.tag_filters,
  })
  if (missions.length === 0) return

  const schedule = config.unlock_type === 'timed' ? config.unlock_schedule : null
  const assignmentCounts = {}
  missions.forEach((m) => (assignmentCounts[m.id] = 0))

  const allRows = []
  for (const participant of participants) {
    const selected = selectMissionsForParticipant(
      config.allocation_mode || 'balanced',
      missions,
      config.mission_count || 3,
      assignmentCounts
    )
    selected.forEach((m, i) => {
      assignmentCounts[m.id] = (assignmentCounts[m.id] || 0) + 1
      allRows.push({
        participant_id: participant.id,
        mission_id: m.id,
        unlock_time: schedule && schedule[i] ? schedule[i] : null,
      })
    })
  }

  if (allRows.length > 0) {
    const { error: missionErr } = await supabase
      .from('participant_missions')
      .insert(allRows)
    if (missionErr) throw missionErr
  }
}
