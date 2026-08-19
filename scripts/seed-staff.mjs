// Creates Supabase Auth users for each staff member (email = name@ghostlab-staff.com,
// password = their PIN) AND the matching row in the `staff` table.
// This has to be a script (not plain SQL) because creating auth users requires
// the Supabase Admin API with your SERVICE ROLE key — never expose that key
// in the frontend, only run this locally.
//
// Usage:
//   1. npm install @supabase/supabase-js dotenv
//   2. Create a .env.local with:
//        SUPABASE_URL=https://your-project-ref.supabase.co
//        SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   <-- from Supabase dashboard, keep secret
//   3. Edit the STAFF list below to match your real roster.
//   4. node scripts/seed-staff.mjs

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Edit this list to match your real staff. `pin` becomes the login PIN.
const STAFF = [
  { name_en: 'Ren', name_th: 'เร็น', pin: '1234', role: 'head_mechanic', branch: 'garage' },
  { name_en: 'Enma', name_th: 'เอ็มม่า', pin: '5678', role: 'chill_staff', branch: 'chill' },
]

// Must match the padding in src/lib/pin.js — Supabase Auth enforces a
// minimum password length that can't be lowered below 6 from the dashboard,
// so we pad the 4-digit PIN with the same fixed suffix used by the app.
const PIN_SUFFIX = '-glab'
function toAuthPassword(pin) { return `${pin}${PIN_SUFFIX}` }

async function main() {
  const { data: branches } = await supabase.from('branches').select('id, key')
  const branchId = key => branches.find(b => b.key === key)?.id

  for (const s of STAFF) {
    const email = `${s.name_en.toLowerCase()}@ghostlab-staff.com`

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: toAuthPassword(s.pin),
      email_confirm: true,
    })
    if (authErr) { console.error(`✗ auth user for ${s.name_en}:`, authErr.message); continue }

    const { error: staffErr } = await supabase.from('staff').insert({
      auth_user_id: authUser.user.id,
      name_en: s.name_en,
      name_th: s.name_th,
      pin_hash: 'managed-by-supabase-auth', // real hashing is handled by Supabase Auth itself
      role: s.role,
      primary_branch: branchId(s.branch),
    })
    if (staffErr) console.error(`✗ staff row for ${s.name_en}:`, staffErr.message)
    else console.log(`✓ created ${s.name_en} (${s.role}) — login PIN: ${s.pin}`)
  }
}

main()
