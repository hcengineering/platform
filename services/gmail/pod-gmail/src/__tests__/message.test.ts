import { sanitizeText } from '../message/v2/message'

/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/unbound-method */

jest.mock('../config')

describe('sanitizeHtml', () => {
  it('should remove all HTML tags', () => {
    const html = '<p>This is <b>bold</b> and <i>italic</i> text</p>'
    const expected = 'This is bold and italic text'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should handle nested tags properly', () => {
    const html = '<div><p>Nested <span>tags <strong>should</strong> be</span> removed</p></div>'
    const expected = 'Nested tags should be removed'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should handle malformed HTML', () => {
    const html = 'Text with <unclosed tag and <p>paragraph</p>'
    const expected = 'Text with paragraph'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should handle scripts and potential XSS attacks', () => {
    const html = 'Hello <script>alert("XSS");</script> world'
    const expected = 'Hello  world'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should remove style tags and attributes', () => {
    const html = '<p style="color:red">Styled text</p>'
    const expected = 'Styled text'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should handle empty input', () => {
    expect(sanitizeText('')).toBe('')
  })
})

describe('sanitizeText', () => {
  it('should remove all HTML tags', () => {
    const html = '<p>This is <b>bold</b> and <i>italic</i> text</p>'
    const expected = 'This is bold and italic text'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should handle nested tags properly', () => {
    const html = '<div><p>Nested <span>tags <strong>should</strong> be</span> removed</p></div>'
    const expected = 'Nested tags should be removed'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should handle malformed HTML', () => {
    const html = 'Text with <unclosed tag and <p>paragraph</p>'
    const expected = 'Text with paragraph'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should handle scripts and potential XSS attacks', () => {
    const html = 'Hello <script>alert("XSS");</script> world'
    const expected = 'Hello  world'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should remove style tags and attributes', () => {
    const html = '<p style="color:red">Styled text</p>'
    const expected = 'Styled text'
    expect(sanitizeText(html)).toBe(expected)
  })

  it('should handle empty input', () => {
    expect(sanitizeText('')).toBe('')
  })
})
