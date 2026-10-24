/** "KES 18,280", with a non-breaking space so it never wraps mid-amount. */
export function kes(amount: number): string {
  return `KES\u00a0${Math.round(amount).toLocaleString('en-KE')}`
}
