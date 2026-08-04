import { splitHighlightSegments } from '../components/HighlightedText.helpers'

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
  it('strips ALL stacked leading prefixes, not just the first', () => {
    // `title: id:loader` → strip `title:` then `id:` → highlight `loader`.
    expect(splitHighlightSegments('Telescopic loader', 'title: id:loader')).toEqual([
      { text: 'Telescopic ', match: false },
      { text: 'loader', match: true },
      { text: '', match: false }
    ])
  })
  it('highlights each term of a multi-word query independently', () => {
    expect(splitHighlightSegments('foo bar baz', 'foo baz')).toEqual([
      { text: '', match: false },
      { text: 'foo', match: true },
      { text: ' bar ', match: false },
      { text: 'baz', match: true },
      { text: '', match: false }
    ])
  })
})
