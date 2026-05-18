import { splitHighlightSegments } from './HighlightedText.helpers'

describe('splitHighlightSegments', () => {
  it('returns single segment when query is empty', () => {
    expect(splitHighlightSegments('hello world', '')).toEqual([{ text: 'hello world', match: false }])
  })
  it('splits the string around a single match (case-insensitive)', () => {
    expect(splitHighlightSegments('Telescopic loader — deliv', 'loader')).toEqual([
      { text: 'Telescopic ', match: false },
      { text: 'loader', match: true },
      { text: ' — deliv', match: false }
    ])
  })
  it('handles multiple matches', () => {
    expect(splitHighlightSegments('aaa bbb aaa', 'aaa')).toEqual([
      { text: '', match: false },
      { text: 'aaa', match: true },
      { text: ' bbb ', match: false },
      { text: 'aaa', match: true },
      { text: '', match: false }
    ])
  })
  it('strips title: prefix from the query before matching', () => {
    expect(splitHighlightSegments('Telescopic loader', 'title:loader')).toEqual([
      { text: 'Telescopic ', match: false },
      { text: 'loader', match: true },
      { text: '', match: false }
    ])
  })
  it('strips id: prefix from the query before matching', () => {
    expect(splitHighlightSegments('HULY-51 something', 'id:HULY-')).toEqual([
      { text: '', match: false },
      { text: 'HULY-', match: true },
      { text: '51 something', match: false }
    ])
  })
  it('strips comments: prefix from the query before matching', () => {
    expect(splitHighlightSegments('See comments below: fine', 'comments:fine')).toEqual([
      { text: 'See comments below: ', match: false },
      { text: 'fine', match: true },
      { text: '', match: false }
    ])
  })
  it('multi-prefix query strips only the first prefix (known v1 limitation)', () => {
    // The helper handles only the leading prefix. A user typing
    // `title:loader id:HULY-` gets the `title:` stripped, leaving
    // `loader id:HULY-` as the literal substring to highlight — which
    // will not match anything in a normal Issue title. Documented as
    // a v1 limitation; v2 (out of this plan) would parse the query
    // into a list of (field, term) tuples and highlight each match
    // separately.
    expect(splitHighlightSegments('Telescopic loader HULY-51', 'title:loader id:HULY-')).toEqual([
      { text: 'Telescopic loader HULY-51', match: false }
    ])
  })
})
