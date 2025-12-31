type AnyObj = Record<string, unknown>

function isObj(x: unknown): x is AnyObj {
  return !!x && typeof x === "object" && !Array.isArray(x)
}

/**
 * Get a localized string by dot-path key.
 * If missing, returns the key itself (safe fallback during rollout).
 */
export function t(messages: AnyObj, key: string): string {
  const parts = key.split(".").filter(Boolean)
  let cur: unknown = messages
  for (const p of parts) {
    if (!isObj(cur) || !(p in cur)) return key
    cur = cur[p]
  }
  return typeof cur === "string" ? cur : key
}


