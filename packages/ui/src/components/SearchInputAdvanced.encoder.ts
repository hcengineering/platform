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

/** Allowed ES-native fields users may type directly. */
const ES_NATIVE_FIELDS = new Set([
  'searchTitle',
  'searchShortTitle',
  'identifier',
  'description.plain',
  'comments.message',
  'fulltextSummary'
])
const USER_PREFIX_KEYS = new Set(Object.keys(PREFIX_ALIAS))

/**
 * Matches `field:` tokens at the start of a substring. Restricted to known
 * user-prefixes + ES-native fields so a stray colon (URLs, times, code) is
 * NOT mistaken for a field-targeted query (which would route to
 * query_string and silently fail on parse errors). Anything else is passed
 * through verbatim and the adapter keeps the simple_query_string path.
 */
function buildKnownPrefixRe (): RegExp {
  const fields = [...USER_PREFIX_KEYS, ...ES_NATIVE_FIELDS]
    // escape dots in `description.plain`, `comments.message`
    .map((f) => f.replace(/\./g, '\\.'))
    .join('|')
  return new RegExp(`(^|\\s)(${fields})\\s*:`, 'gi')
}
const KNOWN_PREFIX_RE = buildKnownPrefixRe()

function aliasPrefixes (input: string): string {
  KNOWN_PREFIX_RE.lastIndex = 0
  return input.replace(KNOWN_PREFIX_RE, (_m, lead: string, field: string) => {
    const lower = field.toLowerCase()
    const aliased = PREFIX_ALIAS[lower] ?? field
    return `${lead}${aliased}:`
  })
}

function hasKnownPrefix (input: string): boolean {
  KNOWN_PREFIX_RE.lastIndex = 0
  return KNOWN_PREFIX_RE.test(input)
}

/**
 * Escape Lucene query_string reserved characters so a bare term we wrap
 * in a scope clause (e.g. `searchTitle:(POC: design review)`) does not
 * accidentally re-enter field-targeted parsing on the inner `:` (which
 * would throw a query_string_parsing_exception in ES and surface as zero
 * hits). Covers the full Lucene reserved set; the wrapping parens are
 * added by the caller, not by user input, so they stay un-escaped here.
 */
function escapeForQueryString (s: string): string {
  return s.replace(/[+\-!(){}[\]^"~*?:\\/]/g, '\\$&')
}

export function encodeSearch (raw: string, scope: SearchScope): string {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  const aliased = aliasPrefixes(trimmed)
  if (hasKnownPrefix(trimmed)) return aliased // user picked a scope explicitly
  const safe = escapeForQueryString(aliased)
  switch (scope) {
    case 'title':
      return `searchTitle:(${safe})`
    case 'title-description':
      return `(searchTitle:(${safe}) OR description.plain:(${safe}))`
    case 'all':
    default:
      return aliased // scope=all routes via simple_query_string; no escaping needed
  }
}
