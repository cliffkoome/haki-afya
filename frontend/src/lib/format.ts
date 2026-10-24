/** "KES 18,280", with a non-breaking space so it never wraps mid-amount. */
export function kes(amount: number): string {
  return `KES\u00a0${Math.round(amount).toLocaleString('en-KE')}`
}

/** SHA's list is ALL CAPS ("MAMA LUCY KIBAKI HOSPITAL"); show it in title case. Mixed-case names pass through. */
export function facilityName(name: string): string {
  if (name !== name.toUpperCase()) return name
  return name.toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}
