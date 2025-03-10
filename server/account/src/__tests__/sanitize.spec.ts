import { sanitizeEmail } from '../operations'

describe('sanitizeEmail', () => {
  it('should lowercase and trim email', () => {
    expect(sanitizeEmail(' Test@Example.com ')).toBe('TestExample.com')
  })

  it('should remove special characters', () => {
    expect(sanitizeEmail('test<>/@{}[]example.com')).toBe('testexample.com')
  })

  it('should remove dangerous protocols', () => {
    expect(sanitizeEmail('javascript:test@example.com')).toBe('testexample.com')
    expect(sanitizeEmail('mailto:test@example.com')).toBe('testexample.com')
    expect(sanitizeEmail('http://test@example.com')).toBe('testexample.com')
  })

  it('should limit length to 40 characters', () => {
    const longEmail = 'verylongemailthatismorethanfortycharacters@example.com'
    expect(sanitizeEmail(longEmail).length).toBe(40)
  })

  it('should handle null or invalid input', () => {
    expect(sanitizeEmail('')).toBe('')
    expect(sanitizeEmail(null as any)).toBe('')
    expect(sanitizeEmail(undefined as any)).toBe('')
  })

  it('should preserve valid email addresses', () => {
    expect(sanitizeEmail('user.name+tag@example.com')).toBe('user.name+tagexample.com')
    expect(sanitizeEmail('test-email@domain.co.uk')).toBe('test-emaildomain.co.uk')
  })
})
