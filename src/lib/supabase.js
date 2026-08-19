import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
export const supabaseConfigError =
  'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add both variables in Vercel Project Settings → Environment Variables, then redeploy.'

// Do not create a client with undefined values. Supabase throws during module
// initialization in that case, which otherwise results in a blank screen.
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null
