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
 * Insert a participant with retry on access code collision (unique_violation 23505).
 *
 * @param {Object} supabase - Supabase client
 * @param {string} eventId - Event UUID
 * @param {string} name - Participant name
 * @param {string} source - 'manual' or 'self'
 * @param {number} maxRetries - Max retry attempts
 * @returns {Object} The inserted participant record
 */
export async function insertParticipantWithRetry(supabase, eventId, name, source = 'manual', maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const accessCode = generateCode(6)
    const { data, error } = await supabase
      .from('participants')
      .insert({
        event_id: eventId,
        name: name.trim(),
        access_code: accessCode,
        source,
      })
      .select()
      .single()

    if (!error) return data

    // Retry only on unique_violation (access code collision)
    if (error.code === '23505' && attempt < maxRetries - 1) continue

    throw error
  }
}
