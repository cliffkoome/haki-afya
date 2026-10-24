import keywords from '../../../data/emergency_keywords.json'

const ALL: string[] = [...(keywords.en ?? []), ...(keywords.sw ?? [])].map((k: string) => k.toLowerCase())

/**
 * Emergency check, layer 1 (document.md section 6): plain keyword match in code,
 * before any API call, so an emergency never waits on the network.
 */
export function looksLikeEmergency(text: string): boolean {
  const t = text.toLowerCase()
  return ALL.some((k) => k && t.includes(k))
}
