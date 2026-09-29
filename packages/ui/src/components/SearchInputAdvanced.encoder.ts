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
import { escapeRegExp, fullTextSearchFields } from '@hcengineering/core'

export type SearchScope = 'title' | 'title-description' | 'all'

/** Map user-friendly prefixes to ES field names. */
const PREFIX_ALIAS: Record<string, string> = {
  title: 'searchTitle',
  id: 'identifier',
  comments: 'comments.message'
}

/**
 * Allowed native full-text fields users may type directly.
 *
 * Derived from the shared {@link fullTextSearchFields} constant in
 * `@hcengineering/core` — the single source of truth also consumed by the
 * server-side full-text adapter (elastic/src/adapter.ts KNOWN_FIELD_RE). The
 * client only routes a `field:value` clause to a field-targeted query when the
 * adapter recognises the same field, so deriving both from one list means the
 * two can never drift apart.
 */
const ES_NATIVE_FIELDS = new Set(fullTextSearchFields)
/** Lowercase → canonical lookup so mixed-case ES-native prefixes normalise. */
const ES_NATIVE_CANON = new Map([...ES_NATIVE_FIELDS].map((f) => [f.toLowerCase(), f]))
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
    // Full regex escaping (shared with the server adapter via core) so a future
    // field with any regex metacharacter cannot silently corrupt the alternation.
    .map((f) => escapeRegExp(f))
    .join('|')
  return new RegExp(`(^|\\s)(${fields})\\s*:`, 'gi')
}
const KNOWN_PREFIX_RE = buildKnownPrefixRe()

function aliasPrefixes (input: string): string {
  KNOWN_PREFIX_RE.lastIndex = 0
  return input.replace(KNOWN_PREFIX_RE, (_m, lead: string, field: string) => {
    const lower = field.toLowerCase()
    // Canonicalise both user-shorthands (title → searchTitle) AND
    // mixed-case ES-native fields (Identifier → identifier, SearchTitle →
    // searchTitle) so the downstream tokenizer's field match — and the ES
    // adapter's KNOWN_FIELD_RE — see the exact canonical field name.
    const aliased = PREFIX_ALIAS[lower] ?? ES_NATIVE_CANON.get(lower) ?? field
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
  // `& | < > =` join the reserved set. `&&`/`||` are the Lucene
  // boolean operators and `< > =` open range comparisons — all three throw a
  // query_string_parsing_exception when they appear un-escaped inside a
  // wrapped field value. Escaping each char keeps the value a literal token.
  return s.replace(/[+\-!(){}[\]^"~*?:\\/&|<>=]/g, '\\$&')
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
/**
 * Character-class body (the part inside `[...]`) of the reserved set above.
 * Single source of truth so the `.test()` check and the `.replace()` escaper
 * can never diverge. Two distinct RegExp objects are built from it below: a
 * global one is required for `.replace()` (escape every occurrence) while a
 * non-global one is used for `.test()` — the same object must NOT serve both,
 * because a global regexp carries a stateful `lastIndex` across `.test()`
 * calls and would intermittently miss matches.
 */
const PREFIX_VALUE_RESERVED_CHARS = '+!(){}[\\]^"~\\\\/:&|<>='
/** Non-global: safe for repeated `.test()` (no `lastIndex` carry-over). */
const PREFIX_VALUE_RESERVED_RE = new RegExp(`[${PREFIX_VALUE_RESERVED_CHARS}]`)
/** Global: escape every reserved char in a `.replace()` pass. */
const PREFIX_VALUE_RESERVED_RE_G = new RegExp(`[${PREFIX_VALUE_RESERVED_CHARS}]`, 'g')

/**
 * Single-pass tokenizer for the prefix-routed encode path.
 *
 * Background: previous iterations of `escapePrefixValues` stacked two
 * regex passes (clause-replace + whitespace-split). Each new edge case
 * (colon-in-value, attached parens, C++ in orphan position, quoted-
 * phrase splitting) required another regex tweak and the logic became
 * fragile. This tokenizer replaces both passes with one walker that
 * emits typed tokens; each token type has exactly one rendering rule.
 *
 * Token grammar:
 *
 *   ws            whitespace run
 *   bool-op       'AND' | 'OR' | 'NOT' (uppercase, standalone)
 *   quoted        `"...somestring..."` — pass through unchanged
 *   field-clause  `<known-field>:<value>` where <value> is one of
 *                   - paren-wrapped  `(...)`     — re-emit with inner escaped
 *                   - quoted phrase  `"..."`      — pass through
 *                   - bare run       `[^\s]+`     — escape+wrap if reserved
 *   bare          any other non-whitespace run — escape reserved chars
 *
 * The tokenizer attempts matches in that priority order at every
 * token boundary (positions immediately after whitespace or at start
 * of input).
 */

type Token =
  | { kind: 'ws', raw: string }
  | { kind: 'bool-op', raw: 'AND' | 'OR' | 'NOT' }
  | { kind: 'quoted', raw: string } // includes the surrounding quotes
  | { kind: 'field-clause', field: string, value: ClauseValue }
  | { kind: 'bare', raw: string }

type ClauseValue = { kind: 'paren', inner: string } | { kind: 'quoted', inner: string } | { kind: 'bare', raw: string }

const BOOL_OPS = new Set(['AND', 'OR', 'NOT'])

function tokenize (input: string): Token[] {
  const tokens: Token[] = []
  // Pre-sort field names longest-first so `description.plain` matches
  // before `description` would (if ever added). Currently no overlap
  // but defensive.
  const fields = [...ES_NATIVE_FIELDS].sort((a, b) => b.length - a.length)

  let i = 0
  while (i < input.length) {
    const ch = input[i]

    // ws
    if (/\s/.test(ch)) {
      let end = i + 1
      while (end < input.length && /\s/.test(input[end])) end++
      tokens.push({ kind: 'ws', raw: input.slice(i, end) })
      i = end
      continue
    }

    // standalone quoted phrase
    if (ch === '"') {
      const close = input.indexOf('"', i + 1)
      if (close >= 0) {
        // Boundary check: after close must be EOF or whitespace
        if (close + 1 === input.length || /\s/.test(input[close + 1])) {
          tokens.push({ kind: 'quoted', raw: input.slice(i, close + 1) })
          i = close + 1
          continue
        }
      }
      // Unbalanced or attached — fall through to bare
    }

    // field-clause: known field name at a token boundary, followed by `:`
    let matched = false
    for (const field of fields) {
      if (i + field.length + 1 > input.length) continue
      // Match the field name case-insensitively; we always emit the
      // canonical `field` (never the typed casing) further down.
      if (input.slice(i, i + field.length).toLowerCase() !== field.toLowerCase()) continue
      if (input[i + field.length] !== ':') continue
      // Skip whitespace after the colon so `title: foo` / `title :  foo`
      // route to a field-clause instead of collapsing to an empty value (which
      // would leave the bare `field:` token to have its colon escaped → 0 hits).
      let valueStart = i + field.length + 1
      while (valueStart < input.length && /\s/.test(input[valueStart])) valueStart++

      // paren-wrapped value
      if (input[valueStart] === '(') {
        const close = input.indexOf(')', valueStart + 1)
        if (close >= 0) {
          tokens.push({
            kind: 'field-clause',
            field,
            value: { kind: 'paren', inner: input.slice(valueStart + 1, close) }
          })
          i = close + 1
          matched = true
          break
        }
      }

      // quoted value
      if (input[valueStart] === '"') {
        const close = input.indexOf('"', valueStart + 1)
        if (close >= 0) {
          tokens.push({
            kind: 'field-clause',
            field,
            value: { kind: 'quoted', inner: input.slice(valueStart + 1, close) }
          })
          i = close + 1
          matched = true
          break
        }
      }

      // bare value: run up to whitespace
      let end = valueStart
      while (end < input.length && !/\s/.test(input[end])) end++
      if (end > valueStart) {
        tokens.push({
          kind: 'field-clause',
          field,
          value: { kind: 'bare', raw: input.slice(valueStart, end) }
        })
        i = end
        matched = true
        break
      }
    }
    if (matched) continue

    // boolean operator (uppercase, standalone — boundary on both sides)
    for (const op of BOOL_OPS) {
      if (input.slice(i, i + op.length) !== op) continue
      const after = i + op.length
      if (after !== input.length && !/\s/.test(input[after])) continue
      tokens.push({ kind: 'bool-op', raw: op as 'AND' | 'OR' | 'NOT' })
      i = after
      matched = true
      break
    }
    if (matched) continue

    // bare token: run up to next whitespace
    let end = i
    while (end < input.length && !/\s/.test(input[end])) end++
    tokens.push({ kind: 'bare', raw: input.slice(i, end) })
    i = end
  }
  return tokens
}

/** Render a single token into its ES-safe wire form. */
function renderToken (tok: Token): string {
  switch (tok.kind) {
    case 'ws':
    case 'bool-op':
    case 'quoted':
      return tok.raw

    case 'field-clause': {
      const { field, value } = tok
      switch (value.kind) {
        case 'paren':
          // User explicitly wrapped value in parens. Re-emit with the inner
          // content escaped so any reserved chars become literal — the
          // wrapping parens themselves are ES grouping syntax, not user
          // text.
          return `${field}:(${escapeForQueryString(value.inner)})`
        case 'quoted':
          // ES phrase literal; pass inner content through verbatim.
          return `${field}:"${value.inner}"`
        case 'bare':
          // Leading '-' on a field-targeted value would be parsed by ES
          // query_string as the Lucene NOT operator (NOT foo), not as
          // literal text. Wrap+escape so the minus stays literal. Mid-
          // token hyphens (HULY-51, bug-fix) are unaffected — they only
          // hit this branch when value.raw does NOT start with '-'.
          if (value.raw.startsWith('-')) {
            return `${field}:(${escapeForQueryString(value.raw)})`
          }
          // Clean value: emit bare for a readable wire string. Reserved
          // chars present: wrap in parens with full Lucene escape so ES
          // query_string parses the value as a single literal token.
          if (!PREFIX_VALUE_RESERVED_RE.test(value.raw)) {
            return `${field}:${value.raw}`
          }
          return `${field}:(${escapeForQueryString(value.raw)})`
      }
      // ClauseValue is exhaustively handled above; this break keeps the
      // outer switch free of implicit fall-through (eslint no-fallthrough).
      break
    }

    case 'bare': {
      // Orphan bare token in a prefix-routed query. Once ANY known prefix
      // appears, the adapter routes via ES query_string (strict parser),
      // so reserved chars here also break the query. Escape per
      // PREFIX_VALUE_RESERVED_RE (narrower than the full Lucene set —
      // see the constant's JSDoc for why `-`, `*`, `?` are excluded).
      //
      // Special case: leading '-' would be parsed as Lucene NOT-operator
      // even though mid-token '-' is tolerant. Escape the leading minus
      // explicitly so the orphan token stays a literal term.
      if (tok.raw.startsWith('-')) {
        return '\\-' + tok.raw.slice(1).replace(PREFIX_VALUE_RESERVED_RE_G, '\\$&')
      }
      if (!PREFIX_VALUE_RESERVED_RE.test(tok.raw)) return tok.raw
      return tok.raw.replace(PREFIX_VALUE_RESERVED_RE_G, '\\$&')
    }
  }
}

function escapePrefixValues (aliased: string): string {
  const tokens = tokenize(aliased)
  // A trailing boolean operator (`foo AND`, `title:foo NOT`) has no
  // right-hand operand, so ES query_string throws a parse exception. Find the
  // last non-whitespace token; if it is a bool-op it is dangling → escape it
  // into a literal term instead of emitting it as an operator.
  let lastNonWs = -1
  for (let k = tokens.length - 1; k >= 0; k--) {
    if (tokens[k].kind !== 'ws') {
      lastNonWs = k
      break
    }
  }
  return tokens
    .map((tok, idx) => (tok.kind === 'bool-op' && idx === lastNonWs ? `\\${tok.raw}` : renderToken(tok)))
    .join('')
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
