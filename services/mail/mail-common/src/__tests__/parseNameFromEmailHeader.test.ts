//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { parseNameFromEmailHeader } from '../utils'
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
      firstName: 'no-reply@example.com',
      lastName: ''
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should parse email with angle brackets only', () => {
    const input = '<support@example.com>'
    const expected: EmailContact = {
      email: 'support@example.com',
      firstName: 'support@example.com',
      lastName: ''
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should parse email with multi-word last name', () => {
    const input = 'Maria Van Der Berg <maria@example.com>'
    const expected: EmailContact = {
      email: 'maria@example.com',
      firstName: 'Maria Van Der Berg',
      lastName: ''
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
      firstName: 'John Doe john.doe@example.com',
      lastName: ''
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should parse single-name format', () => {
    const input = 'Support <help@example.com>'
    const expected: EmailContact = {
      email: 'help@example.com',
      firstName: 'Support',
      lastName: ''
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })

  it('should handle name with special characters', () => {
    const input = '"O\'Neill, James" <james.oneill@example.com>'
    const expected: EmailContact = {
      email: 'james.oneill@example.com',
      firstName: "O'Neill",
      lastName: 'James'
    }

    expect(parseNameFromEmailHeader(input)).toEqual(expected)
  })
})
