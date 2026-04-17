/**
 * Shared mission assignment and code generation utilities.
 * Used by Register.jsx, CreateEvent.jsx, and EventDetail.jsx.
 */

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/**
 * Generate a random alphanumeric code of the given length.
 */
export function generateCode(length = 6) {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

/**
 * Select missions using leveled round-robin (least-assigned first, shuffled within same count).
 *
 * @param {Array} missions - Array of mission objects with at least { id }
 * @param {number} count - Number of missions to select
 * @param {Object} assignmentCounts - Map of mission_id -> assignment count
 * @param {Set} excludeIds - Set of mission IDs to exclude (already assigned)
 * @returns {Array} Selected mission objects
 */
export function selectMissionsLeveledRoundRobin(missions, count, assignmentCounts = {}, excludeIds = new Set()) {
  const eligible = missions.filter((m) => !excludeIds.has(m.id))
  const sorted = [...eligible].sort((a, b) => {
    const diff = (assignmentCounts[a.id] || 0) - (assignmentCounts[b.id] || 0)
    if (diff !== 0) return diff
    return Math.random() - 0.5
  })
  return sorted.slice(0, count)
}

/**
 * Balanced selector — picks one mission at a time, preferring a category
 * the participant doesn't have yet, then breaking ties by least-assigned
 * across the event, then randomly. Falls back gracefully when the
 * remaining pool can't avoid a category repeat.
 *
 * @param {Array} missions - [{ id, category_id }]
 * @param {number} count - Number of missions to pick
 * @param {Object} assignmentCounts - Map mission_id -> count across event
 * @param {Object} participantCategoryCounts - Map category_id -> count already on this participant
 * @param {Set} excludeIds - Mission IDs already assigned to this participant
 * @returns {Array} Selected mission objects (subset of input)
 */
export function selectMissionsBalanced(
  missions,
  count,
  assignmentCounts = {},
  participantCategoryCounts = {},
  excludeIds = new Set()
) {
  const selected = []
  const picked = new Set(excludeIds)
  const localCatCounts = { ...participantCategoryCounts }

  for (let i = 0; i < count; i++) {
    const candidates = missions.filter((m) => !picked.has(m.id))
    if (candidates.length === 0) break

    candidates.sort((a, b) => {
      const aCat = localCatCounts[a.category_id] || 0
      const bCat = localCatCounts[b.category_id] || 0
      if (aCat !== bCat) return aCat - bCat
      const aAssign = assignmentCounts[a.id] || 0
      const bAssign = assignmentCounts[b.id] || 0
      if (aAssign !== bAssign) return aAssign - bAssign
      return Math.random() - 0.5
    })

    const pick = candidates[0]
    selected.push(pick)
    picked.add(pick.id)
    if (pick.category_id) {
      localCatCounts[pick.category_id] = (localCatCounts[pick.category_id] || 0) + 1
    }
  }
  return selected
}

/**
 * Pick missions using the configured allocation mode.
 *
 * @param {'balanced'|'random'} mode
 * @param {Array} missions - [{ id, category_id }] (category_id only required for 'balanced')
 * @param {number} count
 * @param {Object} assignmentCounts
 * @param {Object} participantCategoryCounts
 * @param {Set} excludeIds
 */
export function selectMissionsForParticipant(
  mode,
  missions,
  count,
  assignmentCounts = {},
  participantCategoryCounts = {},
  excludeIds = new Set()
) {
  if (mode === 'random') {
    return selectMissionsLeveledRoundRobin(missions, count, assignmentCounts, excludeIds)
  }
  return selectMissionsBalanced(
    missions,
    count,
    assignmentCounts,
    participantCategoryCounts,
    excludeIds
  )
}

/**
 * Insert a participant with retry on access code collision (unique_violation 23505).
 *
 * @param {Object} supabase - Supabase client
 * @param {string} eventId - Event UUID
 * @param {string} name - Participant name
 * @param {string} source - 'manual' or 'self'
 * @param {number} maxRetries - Max retry attempts
 * @param {string|null} phone - E.164 phone number (optional)
 * @returns {Object} The inserted participant record
 */
export async function insertParticipantWithRetry(supabase, eventId, name, source = 'manual', maxRetries = 3, phone = null) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const accessCode = generateCode(6)
    const payload = {
      event_id: eventId,
      name: name.trim(),
      access_code: accessCode,
      source,
    }
    if (phone) payload.phone = phone
    const { data, error } = await supabase
      .from('participants')
      .insert(payload)
      .select()
      .single()

    if (!error) return data

    // Retry only on unique_violation (access code collision)
    if (error.code === '23505' && attempt < maxRetries - 1) continue

    throw error
  }
}
