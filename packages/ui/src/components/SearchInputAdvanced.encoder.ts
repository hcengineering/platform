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

/**
 * Reserved chars that BREAK ES `query_string` parsing inside a field-value
 * position. Narrower than the full Lucene reserved set because we want to
 * preserve readable, raw values for the common cases. Specifically:
 *
 * - `-` is omitted: ES treats `-` mid-term or at end-of-term as literal text
 *   (identifier-style values like `HULY-51` work without escaping; the only
 *   problematic position is the very start of a clause where `-` is the NOT
 *   operator, but a token starting with `-` would already be lexed as a
 *   bare term, never landing here as a field value).
 * - `*` and `?` are omitted: users may legitimately type them as wildcards.
 *
 * What stays — these literally crash the parser when mid-value:
 *   `+`  `!`  `(`  `)`  `{`  `}`  `[`  `]`  `^`  `"`  `~`  `\`  `/`  `:`
 *
 * `:` is included because the bare-value regex is greedy across non-whitespace
 * (so `title:POC:123` lands here as value `POC:123`); without escaping ES
 * query_string would re-parse the inner `:` as another field-targeted
 * clause, blowing up the entire query.
 */
const PREFIX_VALUE_RESERVED_RE = /[+!(){}[\]^"~\\/:]/

/**
 * For prefix-targeted inputs (e.g. `title:C++ developer` or
 * `comments:foo/bar`), wrap the `<value>` portion of each `<field>:<value>`
 * clause in parens + escape Lucene-reserved chars when the value would
 * otherwise blow up the ES `query_string` parser.
 *
 * Without this, ES parses `C++` as `C` + `+` + `+` and throws
 * `query_string_parsing_exception`, surfacing as zero hits for completely
 * legitimate user input.
 *
 * Strategy: regex-scan the aliased string for `<field>:<value>` clauses
 * where <value> is one of three forms:
 *   1. Already user-wrapped in parens:   `searchTitle:(...)`     → escape inside
 *   2. Quoted phrase:                    `searchTitle:"foo bar"` → pass through (ES treats as phrase literal)
 *   3. Bare run of non-whitespace:       `searchTitle:loader`    → escape+wrap ONLY if reserved chars present
 *
 * Anything outside these clauses (whitespace, boolean operators
 * AND/OR/NOT, standalone parens the user typed for boolean grouping)
 * passes through verbatim. Clean bare values stay unwrapped so the wire
 * string stays readable for the common case.
 */
function escapePrefixValues (aliased: string): string {
  // First pass: process known-field clauses (\b<field>:<value>) so they
  // emit ES-safe wire syntax.
  const fieldAlt = [...ES_NATIVE_FIELDS].map((f) => f.replace(/\./g, '\\.')).join('|')
  // Value patterns, longest-match first:
  //   \(([^()]*)\)  — paren-wrapped: re-emit with inner content escaped
  //   "([^"]*)"     — quoted phrase: pass through (ES phrase literal)
  //   ([^\s]+)      — bare run up to whitespace. INCLUDES attached parens
  //                   etc. so values like `title:foo(bar)` or `title:foo)`
  //                   get captured as the full value `foo(bar)`/`foo)` and
  //                   hit the reserved-char escape branch — without this,
  //                   `foo(bar)` would split into bare=`foo` (clean,
  //                   passed bare) + orphan `(bar)` which pass 2 would
  //                   then try to escape but the resulting token
  //                   `searchTitle:foo(bar)` would already have been
  //                   joined and pass 2 would treat the whole thing as a
  //                   known-field clause and skip it (Codex Round-8).
  const clauseRe = new RegExp(`\\b(${fieldAlt}):(?:\\(([^()]*)\\)|"([^"]*)"|([^\\s]+))`, 'g')

  const firstPass = aliased.replace(clauseRe, (_match, field: string, paren?: string, quoted?: string, bare?: string) => {
    if (paren !== undefined) {
      return `${field}:(${escapeForQueryString(paren)})`
    }
    if (quoted !== undefined) {
      return `${field}:"${quoted}"`
    }
    const value = bare ?? ''
    if (!PREFIX_VALUE_RESERVED_RE.test(value)) {
      return `${field}:${value}`
    }
    return `${field}:(${escapeForQueryString(value)})`
  })

  // Second pass: orphan bare tokens in a prefixed query. Once ANY known
  // prefix appears in the input, the adapter routes the whole string
  // through ES `query_string` (strict parser). Bare tokens like `C++`,
  // `foo/bar` or `12:30` that follow the prefix clause still hit that
  // strict parser, so any Lucene-reserved char in them blows up the
  // entire query — exactly the failure mode Round-6/7 surfaced.
  //
  // Strategy: scan whitespace-separated tokens, escape PREFIX_VALUE_RESERVED_RE
  // chars in tokens that AREN'T:
  //   - known-field clauses (pass 1 already made them safe)
  //   - boolean operators (`AND`/`OR`/`NOT` are case-sensitive uppercase
  //     in Lucene query_string; lowercase is parsed as bare terms)
  //   - quoted phrases (ES treats `"foo bar"` as a phrase literal)
  //
  // We deliberately don't try to preserve standalone `(`/`)` for boolean
  // grouping in orphan tokens: a power user who really wants grouping
  // can write it as a known-field clause (`title:(foo OR bar)`) where
  // pass 1 honours the parens correctly.
  // Stateful tokenizer that respects quoted phrases: a `"..."` may span
  // whitespace and survives as one token (or as part of a larger token
  // like `searchTitle:"foo bar"`). A naive `\S+` split would tear the
  // phrase apart at the inner whitespace and the trailing `bar"` token
  // would then get its closing `"` escaped, breaking ES phrase syntax.
  const knownClauseRe = new RegExp(`^(?:${fieldAlt}):`)
  function processToken (tok: string): string {
    if (knownClauseRe.test(tok)) return tok
    if (tok === 'AND' || tok === 'OR' || tok === 'NOT') return tok
    if (tok.startsWith('"') && tok.endsWith('"')) return tok
    if (!PREFIX_VALUE_RESERVED_RE.test(tok)) return tok
    return tok.replace(/[+!(){}[\]^"~\\/:]/g, '\\$&')
  }

  let out = ''
  let buf = ''
  let inQuote = false
  for (const ch of firstPass) {
    if (inQuote) {
      buf += ch
      if (ch === '"') inQuote = false
      continue
    }
    if (ch === '"') {
      buf += ch
      inQuote = true
      continue
    }
    if (/\s/.test(ch)) {
      if (buf !== '') { out += processToken(buf); buf = '' }
      out += ch
      continue
    }
    buf += ch
  }
  if (buf !== '') out += processToken(buf)
  return out
}

export function encodeSearch (raw: string, scope: SearchScope): string {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  const aliased = aliasPrefixes(trimmed)
  if (hasKnownPrefix(trimmed)) return escapePrefixValues(aliased)
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
