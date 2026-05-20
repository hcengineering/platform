import { encodeSearch } from './SearchInputAdvanced.encoder'

describe('encodeSearch', () => {
  // ─── No prefix: bare-term scope expansion ───────────────────────────────
  it('passes bare terms verbatim when scope=all', () => {
    expect(encodeSearch('loader', 'all')).toBe('loader')
  })
  it('wraps bare terms in searchTitle:(…) when scope=title', () => {
    expect(encodeSearch('loader bar', 'title')).toBe('searchTitle:(loader bar)')
  })
  it('wraps bare terms in OR-clause when scope=title-description', () => {
    expect(encodeSearch('loader', 'title-description'))
      .toBe('(searchTitle:(loader) OR description.plain:(loader))')
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
    expect(encodeSearch('title:loader id:HULY-', 'all'))
      .toBe('searchTitle:loader identifier:HULY-')
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
    expect(encodeSearch('POC: design review', 'title'))
      .toBe('searchTitle:(POC\\: design review)')
  })
  it('treats time-of-day "12:30" as bare text and escapes the colon when scoped', () => {
    expect(encodeSearch('meeting 12:30', 'all')).toBe('meeting 12:30')
    expect(encodeSearch('meeting 12:30', 'title')).toBe('searchTitle:(meeting 12\\:30)')
  })
  it('escapes Lucene operators inside scope-wrapped bare terms', () => {
    expect(encodeSearch('C++ developer', 'title'))
      .toBe('searchTitle:(C\\+\\+ developer)')
    expect(encodeSearch('foo (bar) [baz]', 'title'))
      .toBe('searchTitle:(foo \\(bar\\) \\[baz\\])')
  })

  // ─── Prefix-value escaping (F2 — Codex Round-5) ──────────────────────────
  // Codex flagged that prefix-targeted inputs were sent verbatim to ES
  // query_string, which crashes the parser on Lucene-reserved chars like
  // `+` or `/`. We now wrap+escape ONLY when the value would otherwise
  // blow up; clean values stay readable.
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
    expect(encodeSearch('title:C++ OR id:HULY-1', 'all'))
      .toBe('searchTitle:(C\\+\\+) OR identifier:HULY-1')
  })

  // ─── Colon-in-value (Codex Round-6) ──────────────────────────────────────
  // The bare-value regex is greedy across non-whitespace so a value can
  // contain its own colon. Without escaping that, ES query_string would
  // re-parse the inner colon as another field-targeted clause and the
  // entire query crashes. The encoder now wraps+escapes such values.
  it('wraps + escapes colons inside prefix values', () => {
    expect(encodeSearch('title:POC:123', 'all'))
      .toBe('searchTitle:(POC\\:123)')
    expect(encodeSearch('title:12:30', 'all'))
      .toBe('searchTitle:(12\\:30)')
    expect(encodeSearch('comments:bug:fix', 'all'))
      .toBe('comments.message:(bug\\:fix)')
  })
  it('handles colon-in-value alongside other reserved chars', () => {
    expect(encodeSearch('title:POC:C++', 'all'))
      .toBe('searchTitle:(POC\\:C\\+\\+)')
  })
  it('escapes orphan colons in bare tokens that follow a prefix clause', () => {
    // 'title:meeting 12:30' — the 12:30 has no known-field anchor, but
    // ES query_string still sees a colon there and tries to parse '12'
    // as a field. Second pass escapes orphan colons so they read as
    // literal text.
    expect(encodeSearch('title:meeting 12:30', 'all'))
      .toBe('searchTitle:meeting 12\\:30')
  })

  // ─── Orphan tokens with non-colon reserved chars (Codex Round-7) ─────────
  // Once any prefix appears, the adapter routes via ES query_string so
  // EVERY bare token must be parser-safe — not just colon-bearing ones.
  it('escapes orphan + signs in tokens that follow a prefix clause', () => {
    expect(encodeSearch('title:meeting C++', 'all'))
      .toBe('searchTitle:meeting C\\+\\+')
  })
  it('escapes orphan slashes in tokens that follow a prefix clause', () => {
    expect(encodeSearch('title:meeting foo/bar', 'all'))
      .toBe('searchTitle:meeting foo\\/bar')
  })
  it('escapes orphan parens / brackets / braces in trailing tokens', () => {
    expect(encodeSearch('title:meeting foo)', 'all'))
      .toBe('searchTitle:meeting foo\\)')
    expect(encodeSearch('title:bug list[0]', 'all'))
      .toBe('searchTitle:bug list\\[0\\]')
  })
  it('preserves boolean operators AND/OR/NOT verbatim between orphan tokens', () => {
    expect(encodeSearch('title:meeting AND foo OR bar', 'all'))
      .toBe('searchTitle:meeting AND foo OR bar')
  })
  it('passes through quoted phrases as orphan tokens', () => {
    expect(encodeSearch('title:meeting "release notes"', 'all'))
      .toBe('searchTitle:meeting "release notes"')
  })
  it('preserves wildcards * and ? in orphan tokens', () => {
    // Wildcards are legitimate ES query_string syntax for prefix /
    // single-char match. Leave them un-escaped so the user can type
    // them on purpose.
    expect(encodeSearch('title:meeting foo*', 'all'))
      .toBe('searchTitle:meeting foo*')
    expect(encodeSearch('title:meeting b?r', 'all'))
      .toBe('searchTitle:meeting b?r')
  })
  it('preserves hyphens mid-token in orphan tokens (ES tolerant)', () => {
    expect(encodeSearch('title:meeting bug-fix', 'all'))
      .toBe('searchTitle:meeting bug-fix')
  })
})
