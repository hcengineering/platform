import { parseNameFromEmailHeader } from '../message/message'
import { EmailContact } from '../types'

describe('parseNameFromEmailHeader', () => {
  it('should parse email with name in double quotes', () => {
    const input = '"John Doe" <john.doe@example.com>'
    const expected: EmailContact = {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should parse email with name without quotes', () => {
    const input = 'Jane Smith <jane.smith@example.com>'
    const expected: EmailContact = {
      email: 'jane.smith@example.com',
      firstName: 'Jane',
      lastName: 'Smith'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should parse email without name', () => {
    const input = 'no-reply@example.com'
    const expected: EmailContact = {
      email: 'no-reply@example.com',
      firstName: 'no-reply',
      lastName: 'example.com'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should parse email with angle brackets only', () => {
    const input = '<support@example.com>'
    const expected: EmailContact = {
      email: 'support@example.com',
      firstName: 'support',
      lastName: 'example.com'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should parse email with multi-word last name', () => {
    const input = 'Maria Van Der Berg <maria@example.com>'
    const expected: EmailContact = {
      email: 'maria@example.com',
      firstName: 'Maria',
      lastName: 'Van Der Berg'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should handle undefined input', () => {
    const expected: EmailContact = {
      email: '',
      firstName: '',
      lastName: ''
    }

    expect(parseNameFromEmailHeader(undefined)).toEqual(expected)
  })

  it('should handle empty string input', () => {
    const input = ''
    const expected: EmailContact = {
      email: '',
      firstName: '',
      lastName: ''
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should handle malformed email formats', () => {
    const input = 'John Doe john.doe@example.com'
    const expected: EmailContact = {
      email: 'John Doe john.doe@example.com',
      firstName: 'John Doe john.doe',
      lastName: 'example.com'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should parse single-name format', () => {
    const input = 'Support <help@example.com>'
    const expected: EmailContact = {
      email: 'help@example.com',
      firstName: 'Support',
      lastName: 'example.com'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should handle name with special characters', () => {
    const input = '"O\'Neill, James" <james.oneill@example.com>'
    const expected: EmailContact = {
      email: 'james.oneill@example.com',
      firstName: "O'Neill,",
      lastName: 'James'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })
})
