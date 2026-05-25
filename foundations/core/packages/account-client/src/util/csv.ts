//
// Copyright © 2026 Hardcore Engineering Inc.
//

/**
 * Escape a single value for CSV. Adds double-quote wrapping only when
 * the value contains a comma, double quote, CR, or LF. CR/LF both
 * trigger quoting because RFC 4180 permits CRLF terminators inside
 * quoted fields and Excel-on-Windows treats a bare \r as a record
 * separator.
 */
export function csvEscape (v: unknown): string {
  const s = v == null ? '' : String(v)
  return (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
    ? '"' + s.replace(/"/g, '""') + '"'
    : s
}

/**
 * Build a single CSV row from a list of values, terminating with \r\n
 * per RFC 4180 §2.1. The CRLF terminator is what Excel-on-Windows and
 * older spreadsheet apps expect; a bare LF was being silently coerced
 * to one mangled row on some import paths.
 */
export function csvLine (cols: ReadonlyArray<unknown>): string {
  return cols.map(csvEscape).join(',') + '\r\n'
}
