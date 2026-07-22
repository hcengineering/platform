import { csvEscape, csvLine } from '../util/csv'

describe('csvEscape', () => {
  it('returns empty string for null/undefined', () => {
    expect(csvEscape(null)).toBe('')
    expect(csvEscape(undefined)).toBe('')
  })
  it('returns plain string unchanged when no quoting is needed', () => {
    expect(csvEscape('hello')).toBe('hello')
    expect(csvEscape(42)).toBe('42')
  })
  it('quotes when the value contains a comma', () => {
    expect(csvEscape('a, b')).toBe('"a, b"')
  })
  it('quotes when the value contains a double quote and doubles it', () => {
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""')
  })
  it('quotes when the value contains a newline', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"')
  })
  it('quotes when the value contains a carriage return', () => {
    expect(csvEscape('line1\rline2')).toBe('"line1\rline2"')
  })
  it('quotes when the value contains CRLF', () => {
    expect(csvEscape('line1\r\nline2')).toBe('"line1\r\nline2"')
  })
})

describe('csvLine', () => {
  it('joins values with commas and appends RFC-4180 CRLF', () => {
    expect(csvLine(['a', 1, 'b'])).toBe('a,1,b\r\n')
  })
  it('escapes each value individually', () => {
    expect(csvLine(['a,b', 'c'])).toBe('"a,b",c\r\n')
  })
})
