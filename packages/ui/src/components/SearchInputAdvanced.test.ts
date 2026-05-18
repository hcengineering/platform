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
})
