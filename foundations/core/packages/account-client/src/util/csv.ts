//
// Copyright © 2026 Hardcore Engineering Inc.
//

/**
 * Escape a single value for CSV. Adds double-quote wrapping only when
 * the value contains a comma, double quote, or newline.
 */
export function csvEscape (v: unknown): string {
  const s = v == null ? '' : String(v)
  return (s.includes(',') || s.includes('"') || s.includes('\n'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s
}

/**
 * Build a single CSV row from a list of values, terminating with \n.
 */
export function csvLine (cols: ReadonlyArray<unknown>): string {
  return cols.map(csvEscape).join(',') + '\n'
}
