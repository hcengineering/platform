//
// V8 — Build a two-line tooltip string for an audit timestamp.
//   Line 1: "Local time: <local-string> (<TZ name>, UTC<+/-N>)"
//   Line 2: "UTC: YYYY-MM-DD HH:MM:SS"
//
// Exported as its own module for unit-testability; AdminAudit.svelte
// imports tzTooltip and uses the result as a `title` attribute on each
// timestamp render site. Falls back to "Local time:" without zone name
// when Intl is unavailable.
//

export function tzTooltip (tsMs: number): string {
  const d = new Date(tsMs)
  let zoneName: string | undefined
  let offsetLabel: string | undefined
  try {
    const intlResolved = Intl.DateTimeFormat().resolvedOptions()
    zoneName = intlResolved.timeZone
    const fmt = new Intl.DateTimeFormat(undefined, { timeZoneName: 'shortOffset' })
    const parts = fmt.formatToParts(d)
    const off = parts.find((p) => p.type === 'timeZoneName')?.value
    if (off != null) offsetLabel = off
  } catch {
    // Intl unavailable — leave zoneName/offsetLabel undefined
  }
  const localLine =
    zoneName != null && offsetLabel != null
      ? `Local time: ${d.toLocaleString()} (${zoneName}, ${offsetLabel})`
      : `Local time: ${d.toLocaleString()}`
  const utcLine = `UTC: ${d.toISOString().replace('T', ' ').slice(0, 19)}`
  return `${localLine}\n${utcLine}`
}
