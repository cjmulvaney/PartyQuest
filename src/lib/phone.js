/**
 * Phone number normalization and validation utilities.
 * Handles US phone inputs and converts to E.164 format.
 */

/**
 * Normalize a raw US phone input to E.164 format (+1XXXXXXXXXX).
 * Strips formatting characters and prepends +1 if needed.
 * Returns null if the input doesn't look like a valid phone number.
 */
export function normalizePhone(raw) {
  if (!raw) return null
  // Strip everything except digits and leading +
  const stripped = raw.replace(/[^\d+]/g, '')

  // Already E.164 with country code
  if (/^\+1\d{10}$/.test(stripped)) return stripped

  // Has +  but not +1 — international, pass through if valid E.164
  if (/^\+[2-9]\d{6,14}$/.test(stripped)) return stripped

  // 10 digits — assume US
  const digits = stripped.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`

  // 11 digits starting with 1 — US with country code
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`

  return null
}

/**
 * Validate that a string is a valid E.164 phone number.
 */
export function isValidPhone(e164) {
  if (!e164) return false
  return /^\+[1-9]\d{1,14}$/.test(e164)
}
