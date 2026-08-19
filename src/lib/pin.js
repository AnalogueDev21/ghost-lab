// Supabase Auth enforces a minimum password length (can't be lowered below 6
// from the dashboard). The UI only ever shows/collects a 4-digit PIN, so we
// pad it with a fixed suffix here before sending it to Supabase as the
// "password". This is purely to satisfy the length rule — it doesn't change
// what the person types or sees, and the real secret is still the 4-digit PIN.
const PIN_SUFFIX = '-glab'

export function toAuthPassword(pin) {
  return `${pin}${PIN_SUFFIX}`
}
