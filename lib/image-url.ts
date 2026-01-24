import { supabase } from "@/lib/supabase"

const DEFAULT_FALLBACK = "/no_photo.jpg?height=300&width=400"

function isExternalUrl(s: string): boolean {
  return /^(https?:)?\/\//i.test(s)
}

function isDataUrl(s: string): boolean {
  return /^data:/i.test(s)
}

/**
 * `image_path` can be either:
 * - a Supabase Storage object key (e.g. "shops/123.jpg")
 * - an absolute external URL (e.g. "https://...")
 * - a local public asset path (e.g. "/no_photo.jpg")
 */
export function resolvePublicImageUrl(
  imagePath: string | null | undefined,
  fallback: string = DEFAULT_FALLBACK,
): string {
  const p = (imagePath ?? "").trim()
  if (!p) return fallback

  // Already a fully-qualified URL (external or already a Supabase public URL)
  if (isExternalUrl(p) || isDataUrl(p)) return p

  // Local public asset
  if (p.startsWith("/")) return p

  // Supabase object key
  return supabase.storage.from("cms-images").getPublicUrl(p).data.publicUrl
}

export function isExternalImagePath(imagePath: string | null | undefined): boolean {
  const p = (imagePath ?? "").trim()
  return Boolean(p && (isExternalUrl(p) || isDataUrl(p)))
}

