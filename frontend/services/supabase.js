import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://TU_PROYECTO.supabase.co'
const supabaseAnonKey = 'TU_ANON_KEY'

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
)