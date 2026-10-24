/** "KES 18,280" */
export function kes(amount: number): string {
  return `KES ${Math.round(amount).toLocaleString('en-KE')}`
}
