import { createClient } from "@supabase/supabase-js"

/**
 * NOTE (Next.js):
 * - `NEXT_PUBLIC_*` variables are inlined into client bundles ONLY when referenced statically
 *   like `process.env.NEXT_PUBLIC_SUPABASE_URL`.
 * - Avoid dynamic access like `process.env[name]` in code that can run on the client.
 */
function missingEnv(name: string): never {
  // Give a human-friendly message instead of Supabase's "supabaseUrl is required."
  // Note: Next.js only loads `.env.local` / `.env`-family files automatically.
  throw new Error(
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || missingEnv("NEXT_PUBLIC_SUPABASE_URL")
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || missingEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

