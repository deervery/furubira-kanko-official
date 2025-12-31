export const SUPPORTED_LANGS = ["ja", "en"] as const
export type Lang = (typeof SUPPORTED_LANGS)[number]

export const DEFAULT_LANG: Lang = "ja"

export function isLang(x: string | undefined | null): x is Lang {
  return x === "ja" || x === "en"
}


