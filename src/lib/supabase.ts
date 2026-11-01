import { createClient } from '@supabase/supabase-js'

const env = import.meta.env

const url: string | undefined = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL
const chave: string | undefined =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

/** false quando as variáveis de ambiente não foram configuradas. */
export const supabaseConfigurado = Boolean(url && chave)

export const supabase = createClient(url ?? 'http://localhost', chave ?? 'chave-ausente', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
