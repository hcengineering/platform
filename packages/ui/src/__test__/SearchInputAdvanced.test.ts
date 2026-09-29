import { encodeSearch } from '../components/SearchInputAdvanced.encoder'
import { propSyncValue } from '../components/SearchInputAdvanced.sync'

describe('encodeSearch', () => {
  // ─── No prefix: bare-term scope expansion ───────────────────────────────
  it('passes bare terms verbatim when scope=all', () => {
    expect(encodeSearch('loader', 'all')).toBe('loader')
  })
  it('wraps bare terms in searchTitle:(…) when scope=title', () => {
    expect(encodeSearch('loader bar', 'title')).toBe('searchTitle:(loader bar)')
  })
  it('wraps bare terms in OR-clause when scope=title-description', () => {
    expect(encodeSearch('loader', 'title-description')).toBe('(searchTitle:(loader) OR description.plain:(loader))')
  })

  // ─── Prefix aliasing: user-shorthand → ES field name ────────────────────
  it('aliases title: → searchTitle: in the wire string', () => {
    expect(encodeSearch('title:loader', 'all')).toBe('searchTitle:loader')
  })
  it('aliases id: → identifier:', () => {
    expect(encodeSearch('id:HULY-', 'all')).toBe('identifier:HULY-')
    expect(encodeSearch('id:HULY-51', 'title')).toBe('identifier:HULY-51')
  })
  it('aliases comments: → comments.message:', () => {
    expect(encodeSearch('comments:foo', 'all')).toBe('comments.message:foo')
  })
  it('preserves prefix-targeted terms when multiple are typed', () => {
    expect(encodeSearch('title:loader id:HULY-', 'all')).toBe('searchTitle:loader identifier:HULY-')
  })

  // ─── Edge cases ─────────────────────────────────────────────────────────
  it('returns empty string for empty input', () => {
    expect(encodeSearch('', 'all')).toBe('')
    expect(encodeSearch('   ', 'all')).toBe('')
  })
  it('passes ES-native field syntax through unchanged', () => {
    // Power users who already know ES fields can bypass the alias.
    expect(encodeSearch('searchTitle:loader', 'all')).toBe('searchTitle:loader')
    expect(encodeSearch('identifier:HULY-1', 'all')).toBe('identifier:HULY-1')
  })
  it('treats unknown prefixes as bare terms (no field-routing)', () => {
    // `POC:` is not a known prefix; the user typed a colon in their text,
    // not a field-targeted query. The encoder leaves it intact for the
    // simple_query_string path (scope=all) and Lucene-escapes the colon
    // when wrapping into a query_string field clause (scope=title) so the
    // adapter cannot accidentally re-parse it as a nested field selector.
    expect(encodeSearch('POC: design review', 'all')).toBe('POC: design review')
    expect(encodeSearch('POC: design review', 'title')).toBe('searchTitle:(POC\\: design review)')
  })
  it('treats time-of-day "12:30" as bare text and escapes the colon when scoped', () => {
    expect(encodeSearch('meeting 12:30', 'all')).toBe('meeting 12:30')
    expect(encodeSearch('meeting 12:30', 'title')).toBe('searchTitle:(meeting 12\\:30)')
  })
  it('escapes Lucene operators inside scope-wrapped bare terms', () => {
    expect(encodeSearch('C++ developer', 'title')).toBe('searchTitle:(C\\+\\+ developer)')
    expect(encodeSearch('foo (bar) [baz]', 'title')).toBe('searchTitle:(foo \\(bar\\) \\[baz\\])')
  })

  // ─── Prefix-value escaping ───────────────────────────────────────────────
  // Prefix-targeted inputs were previously sent verbatim to ES query_string,
  // which crashes the parser on Lucene-reserved chars like `+` or `/`.
  // We now wrap+escape ONLY when the value would otherwise blow up; clean
  // values stay readable.
  it('wraps + escapes prefix values containing Lucene reserved chars', () => {
    expect(encodeSearch('title:C++', 'all')).toBe('searchTitle:(C\\+\\+)')
    expect(encodeSearch('comments:foo/bar', 'all')).toBe('comments.message:(foo\\/bar)')
  })
  it('treats user-typed parens around a prefix value as ES grouping', () => {
    // `title:(scope)` is ambiguous between "literal parens in text" and
    // "ES query_string grouping". We pick the latter (more useful to
    // power users); a user who wants literal parens can quote the value:
    // `title:"(scope)"`.
    expect(encodeSearch('title:(scope)', 'all')).toBe('searchTitle:(scope)')
    expect(encodeSearch('title:(C++)', 'all')).toBe('searchTitle:(C\\+\\+)')
  })
  it('leaves clean prefix values bare so the wire string stays readable', () => {
    // No reserved chars → no wrap. Preserves the simple common case.
    expect(encodeSearch('title:loader', 'all')).toBe('searchTitle:loader')
    expect(encodeSearch('id:HULY-51', 'all')).toBe('identifier:HULY-51')
    expect(encodeSearch('comments:fixed', 'all')).toBe('comments.message:fixed')
  })
  it('passes quoted prefix values through as phrase literals', () => {
    // Quoted phrases are an ES query_string phrase literal — no escape
    // needed even when the inner text would otherwise be reserved.
    expect(encodeSearch('title:"foo bar"', 'all')).toBe('searchTitle:"foo bar"')
  })
  it('preserves boolean operators between prefix clauses', () => {
    // Power-user syntax: AND/OR between prefix-targeted clauses must
    // pass through, only the values get wrapped when needed.
    expect(encodeSearch('title:C++ OR id:HULY-1', 'all')).toBe('searchTitle:(C\\+\\+) OR identifier:HULY-1')
  })

  // ─── Colon-in-value handling ─────────────────────────────────────────────
  // The bare-value regex is greedy across non-whitespace so a value can
  // contain its own colon. Without escaping that, ES query_string would
  // re-parse the inner colon as another field-targeted clause and the
  // entire query crashes. The encoder now wraps+escapes such values.
  it('wraps + escapes colons inside prefix values', () => {
    expect(encodeSearch('title:POC:123', 'all')).toBe('searchTitle:(POC\\:123)')
    expect(encodeSearch('title:12:30', 'all')).toBe('searchTitle:(12\\:30)')
    expect(encodeSearch('comments:bug:fix', 'all')).toBe('comments.message:(bug\\:fix)')
  })
  it('handles colon-in-value alongside other reserved chars', () => {
    expect(encodeSearch('title:POC:C++', 'all')).toBe('searchTitle:(POC\\:C\\+\\+)')
  })
  it('escapes orphan colons in bare tokens that follow a prefix clause', () => {
    // 'title:meeting 12:30' — the 12:30 has no known-field anchor, but
    // ES query_string still sees a colon there and tries to parse '12'
    // as a field. Second pass escapes orphan colons so they read as
    // literal text.
    expect(encodeSearch('title:meeting 12:30', 'all')).toBe('searchTitle:meeting 12\\:30')
  })

  // ─── Orphan tokens with reserved chars ───────────────────────────────────
  // Once any prefix appears, the adapter routes via ES query_string so
  // EVERY bare token must be parser-safe — not just colon-bearing ones.
  it('escapes orphan + signs in tokens that follow a prefix clause', () => {
    expect(encodeSearch('title:meeting C++', 'all')).toBe('searchTitle:meeting C\\+\\+')
  })
  it('escapes orphan slashes in tokens that follow a prefix clause', () => {
    expect(encodeSearch('title:meeting foo/bar', 'all')).toBe('searchTitle:meeting foo\\/bar')
  })
  it('escapes orphan parens / brackets / braces in trailing tokens', () => {
    expect(encodeSearch('title:meeting foo)', 'all')).toBe('searchTitle:meeting foo\\)')
    expect(encodeSearch('title:bug list[0]', 'all')).toBe('searchTitle:bug list\\[0\\]')
  })
  it('preserves boolean operators AND/OR/NOT verbatim between orphan tokens', () => {
    expect(encodeSearch('title:meeting AND foo OR bar', 'all')).toBe('searchTitle:meeting AND foo OR bar')
  })
  it('passes through quoted phrases as orphan tokens', () => {
    expect(encodeSearch('title:meeting "release notes"', 'all')).toBe('searchTitle:meeting "release notes"')
  })
  it('preserves wildcards * and ? in orphan tokens', () => {
    // Wildcards are legitimate ES query_string syntax for prefix /
    // single-char match. Leave them un-escaped so the user can type
    // them on purpose.
    expect(encodeSearch('title:meeting foo*', 'all')).toBe('searchTitle:meeting foo*')
    expect(encodeSearch('title:meeting b?r', 'all')).toBe('searchTitle:meeting b?r')
  })
  it('preserves hyphens mid-token in orphan tokens (ES tolerant)', () => {
    expect(encodeSearch('title:meeting bug-fix', 'all')).toBe('searchTitle:meeting bug-fix')
  })

  // ─── Attached parens in prefix values ────────────────────────────────────
  // The bare-value regex previously stopped before `(` / `)`, so
  // `title:foo(bar)` slipped through as `searchTitle:foo(bar)` raw —
  // pass 2 saw a known-field prefix on the token and passed it through
  // verbatim, never escaping the embedded parens. Now the bare-value
  // pattern extends to whitespace, so attached parens get captured as
  // part of the value and wrapped+escaped properly.
  it('wraps + escapes prefix values with attached parens', () => {
    expect(encodeSearch('title:foo(bar)', 'all')).toBe('searchTitle:(foo\\(bar\\))')
    expect(encodeSearch('title:foo)', 'all')).toBe('searchTitle:(foo\\))')
  })
  it('wraps + escapes prefix values with attached brackets', () => {
    expect(encodeSearch('title:list[0]', 'all')).toBe('searchTitle:(list\\[0\\])')
  })
  it('keeps user-wrapped parens distinct from attached parens', () => {
    // `title:(scope)` — explicit paren-wrap, value is `scope` (no
    // reserved chars after stripping the wrap) — passes through bare.
    expect(encodeSearch('title:(scope)', 'all')).toBe('searchTitle:(scope)')
    // `title:foo(bar)` — bare value with attached parens, wrap+escape.
    expect(encodeSearch('title:foo(bar)', 'all')).toBe('searchTitle:(foo\\(bar\\))')
  })

  // ─── Leading-hyphen escape (Lucene NOT-operator) ─────────────────────────
  // `-` mid-token (HULY-51, bug-fix) is tolerated by ES, but a leading
  // '-' is interpreted as the Lucene NOT operator. Field-targeted values
  // with leading '-' need to be wrap+escaped; orphan tokens with leading
  // '-' need at minimum the minus escaped so they stay literal.
  it('wraps + escapes prefix values starting with a hyphen', () => {
    expect(encodeSearch('title:-foo', 'all')).toBe('searchTitle:(\\-foo)')
    expect(encodeSearch('id:-WORK-1', 'all')).toBe('identifier:(\\-WORK\\-1)')
  })
  it('escapes a leading hyphen in orphan bare tokens after a prefix clause', () => {
    expect(encodeSearch('title:meeting -cancelled', 'all')).toBe('searchTitle:meeting \\-cancelled')
  })
  it('preserves mid-token hyphens in field values and orphan tokens', () => {
    // Regression: identifier-style values keep their internal hyphens.
    expect(encodeSearch('id:HULY-51', 'all')).toBe('identifier:HULY-51')
    // Regression: orphan token with mid-hyphen passes through untouched.
    expect(encodeSearch('title:meeting bug-fix', 'all')).toBe('searchTitle:meeting bug-fix')
  })

  // ─── Whitespace after the field colon ─────────────────────────────────────
  // `title: foo` (space after the colon) previously collapsed to an empty
  // value; the bare `title:` token then had its colon escaped → 0 hits. The
  // tokenizer now skips whitespace after the colon and routes the clause.
  it('routes field-clauses with a space after the colon', () => {
    expect(encodeSearch('title: foo', 'all')).toBe('searchTitle:foo')
    expect(encodeSearch('title :  foo', 'all')).toBe('searchTitle:foo')
    expect(encodeSearch('id: HULY-1', 'all')).toBe('identifier:HULY-1')
  })

  // ─── Mixed-case ES-native + user prefixes ─────────────────────────────────
  // A field prefix typed in any casing must canonicalise to the exact ES
  // field name; otherwise the case-sensitive tokenizer/adapter miss it and
  // the colon gets escaped → 0 hits.
  it('canonicalises mixed-case field prefixes', () => {
    expect(encodeSearch('Identifier:HULY-1', 'all')).toBe('identifier:HULY-1')
    expect(encodeSearch('SearchTitle:foo', 'all')).toBe('searchTitle:foo')
    expect(encodeSearch('TITLE:foo', 'all')).toBe('searchTitle:foo')
  })

  // ─── Lucene boolean-operator + comparison chars ───────────────────────────
  // `&& || < > =` open boolean/range parsing in ES query_string; when we wrap
  // a bare term into a scope clause they must be escaped so the value stays a
  // literal and never throws query_string_parsing_exception.
  it('escapes && || < > = inside scope-wrapped bare terms', () => {
    expect(encodeSearch('a && b', 'title')).toBe('searchTitle:(a \\&\\& b)')
    expect(encodeSearch('a || b', 'title')).toBe('searchTitle:(a \\|\\| b)')
    expect(encodeSearch('x <= y', 'title')).toBe('searchTitle:(x \\<\\= y)')
  })
  it('neutralises a dangling boolean operator at clause end', () => {
    // Non-prefix scope-wrap: `foo AND` is grouped verbatim (AND is a bare word
    // here, not routed through the strict tokenizer path).
    expect(encodeSearch('foo AND', 'title')).toBe('searchTitle:(foo AND)')
    // Prefix path: a trailing operator with no operand would throw, so the
    // tokenizer escapes it into a literal term.
    expect(encodeSearch('title:foo NOT', 'all')).toBe('searchTitle:foo \\NOT')
  })
})

// The re-sync decision is extracted so it can be unit-tested here (the .svelte
// component itself cannot be mounted — ts-jest has no Svelte compiler). The
// behavioural proof of the whole flow lives in the tracker create→search→open
// E2E cluster.
describe('propSyncValue (search input re-sync)', () => {
  it('syncs the new value when the parent prop changed', () => {
    expect(propSyncValue('bar', 'foo')).toBe('bar')
    expect(propSyncValue('x', undefined)).toBe('x')
  })

  it('returns undefined (no sync) when the parent prop is unchanged', () => {
    expect(propSyncValue('foo', 'foo')).toBeUndefined()
    expect(propSyncValue('', '')).toBeUndefined()
  })

  it('returns undefined when the parent prop is undefined', () => {
    expect(propSyncValue(undefined, 'foo')).toBeUndefined()
  })

  // The anti-clobber invariant: while the debounced parent prop still lags at
  // its previous value, the local input must not be re-synced — otherwise a
  // just-typed value is erased, which broke tracker create→search→open
  // (Playwright fill() then read == empty, so the search was never submitted).
  it('never re-syncs an unchanged (debounce-lagged) prop', () => {
    // parent prop still '' from before; user has typed into the input — no sync
    expect(propSyncValue('', '')).toBeUndefined()
  })
})
