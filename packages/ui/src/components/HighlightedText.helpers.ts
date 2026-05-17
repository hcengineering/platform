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
  const trimmed = query.trim().replace(USER_PREFIX_RE, '').trim()
  if (trimmed === '') return [{ text, match: false }]
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(re)
  return parts.map((p, i) => ({ text: p, match: i % 2 === 1 }))
}
