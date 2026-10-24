/** A short tick on meaningful moments only (copy, choice, report sent). Silent where unsupported. */
export function tick(ms = 10): void {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // Vibration API missing or blocked.
  }
}
