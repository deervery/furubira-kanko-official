import { createClient, type SupabaseClient } from "@supabase/supabase-js"

/**
 * NOTE (Next.js):
 * - `NEXT_PUBLIC_*` variables are inlined into client bundles ONLY when referenced statically
 *   like `process.env.NEXT_PUBLIC_SUPABASE_URL`.
 * - Avoid dynamic access like `process.env[name]` in code that can run on the client.
 *
 * This module is imported by both client and server code.
 * To avoid hard-crashing routes at import-time, we initialize Supabase lazily.
 */

function missingEnvError(name: string): Error {
  return new Error(
    [
      `[supabase] Missing required environment variable: ${name}`,
      "",
      "Fix:",
      "- Create `.env.local` at the project root (do not commit it)",
      `- Add: ${name}=...`,
      "",
      "Then restart `next dev`.",
    ].join("\n"),
  )
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

let _client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) throw missingEnvError("NEXT_PUBLIC_SUPABASE_URL")

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseAnonKey) throw missingEnvError("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (!_client) _client = createClient(supabaseUrl, supabaseAnonKey)
  return _client
}

export function getSupabaseClientOrNull(): SupabaseClient | null {
  try {
    return getSupabaseClient()
  } catch {
    return null
  }
}

/**
 * Backward-compatible export.
 * Accessing properties will throw a helpful error if env is missing.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient()
    return (client as any)[prop]
  },
}) as SupabaseClient

