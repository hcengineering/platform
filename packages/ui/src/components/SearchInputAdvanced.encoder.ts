//
// Copyright © 2026 Hardcore Engineering Inc.
// SPDX-License-Identifier: EPL-2.0
//
/**
 * Encode the raw Lupe input into the wire-string for $search.
 *
 * Two transformations applied:
 *
 * 1. **User-prefix → ES-field aliasing.** User-friendly shorthands map to
 *    the actual indexed field names:
 *      title:foo    → searchTitle:foo
 *      id:foo       → identifier:foo
 *      comments:foo → comments.message:foo
 *    ES-native field names (searchTitle:, identifier:, description.plain:,
 *    comments.message:) pass through verbatim — power users can use them
 *    directly.
 *
 * 2. **Bare-term scope wrapping.** When the input contains no prefix at all
 *    AND the Customize-View `searchScope` is restrictive, wrap the bare
 *    terms in the field-scope:
 *      scope=title             → searchTitle:(<bare>)
 *      scope=title-description → (searchTitle:(<bare>) OR description.plain:(<bare>))
 *      scope=all               → <bare> (untouched; the adapter falls back to
 *                                simple_query_string across all indexed text)
 *
 * The two transformations are independent; an input that already contains
 * a prefix is only aliased (transformation 1), never wrapped (transformation
 * 2). This matches user intent — they specified a field explicitly.
 */
export type SearchScope = 'title' | 'title-description' | 'all'

/** Map user-friendly prefixes to ES field names. */
const PREFIX_ALIAS: Record<string, string> = {
  title: 'searchTitle',
  id: 'identifier',
  comments: 'comments.message'
}

/** Matches ANY `field:` token at the start of a substring. */
const ANY_PREFIX_RE = /(^|\s)([a-zA-Z][a-zA-Z0-9_.]*)\s*:/g
const USER_PREFIX_KEYS = new Set(Object.keys(PREFIX_ALIAS))

function aliasPrefixes (input: string): string {
  return input.replace(ANY_PREFIX_RE, (m, lead: string, field: string) => {
    if (USER_PREFIX_KEYS.has(field.toLowerCase())) {
      return `${lead}${PREFIX_ALIAS[field.toLowerCase()]}:`
    }
    return m
  })
}

function hasPrefix (input: string): boolean {
  ANY_PREFIX_RE.lastIndex = 0
  return ANY_PREFIX_RE.test(input)
}

export function encodeSearch (raw: string, scope: SearchScope): string {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  const aliased = aliasPrefixes(trimmed)
  if (hasPrefix(trimmed)) return aliased // user picked a scope explicitly
  switch (scope) {
    case 'title':
      return `searchTitle:(${aliased})`
    case 'title-description':
      return `(searchTitle:(${aliased}) OR description.plain:(${aliased}))`
    case 'all':
    default:
      return aliased
  }
}
