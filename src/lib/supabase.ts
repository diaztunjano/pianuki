// Supabase client singleton
// Install now — wire auth/data calls in future phases
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// In Phase 1, these may be empty strings — client still initializes without errors
// Future phases will require a real project URL + anon key
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')
