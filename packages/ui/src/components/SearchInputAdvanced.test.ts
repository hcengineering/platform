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
    expect(encodeSearch('id:OSKOS-', 'all')).toBe('identifier:OSKOS-')
    expect(encodeSearch('id:OSKOS-51', 'title')).toBe('identifier:OSKOS-51')
  })
  it('aliases comments: → comments.message:', () => {
    expect(encodeSearch('comments:foo', 'all')).toBe('comments.message:foo')
  })
  it('preserves prefix-targeted terms when multiple are typed', () => {
    expect(encodeSearch('title:loader id:OSKOS-', 'all'))
      .toBe('searchTitle:loader identifier:OSKOS-')
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
})
