//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
/**
 * Strip user-typed prefixes (title:, id:, comments:) from the query before
 * matching. The encoded wire-form (searchTitle:, identifier:,
 * comments.message:, plus scope-wrapping like searchTitle:(loader)) NEVER
 * reaches this function — IssuesView feeds the RAW input.
 *
 * If the caller ever DOES pass an encoded string by accident (a future
 * refactor regresses the raw/encoded split), the helper degrades
 * gracefully: it will match the wire-form literally against the title,
 * find nothing, and return the full text unmarked. No exception thrown.
 */
const USER_PREFIX_RE = /^\s*(title|id|comments)\s*:\s*/i

export interface Segment {
  text: string
  match: boolean
}

export function splitHighlightSegments (text: string, query: string): Segment[] {
  // Strip ALL stacked leading prefixes (e.g. "title: id: foo"), not
  // just the first one.
  let trimmed = query.trim()
  let prev = ''
  while (trimmed !== prev) {
    prev = trimmed
    trimmed = trimmed.replace(USER_PREFIX_RE, '').trim()
  }
  if (trimmed === '') return [{ text, match: false }]
  // Highlight semantics match search semantics — a multi-word query
  // highlights each term independently (alternation), not the phrase verbatim.
  const terms = trimmed
    .split(/\s+/)
    .filter((t) => t.length > 0)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (terms.length === 0) return [{ text, match: false }]
  const re = new RegExp(`(${terms.join('|')})`, 'gi')
  const parts = text.split(re)
  return parts.map((p, i) => ({ text: p, match: i % 2 === 1 }))
}
