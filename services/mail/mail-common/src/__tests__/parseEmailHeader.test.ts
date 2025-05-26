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

import { parseEmailHeader } from '../utils'

describe('parseEmailHeader', () => {
  it('should handle undefined input', () => {
    const result = parseEmailHeader(undefined)
    expect(result).toEqual([])
  })

  it('should handle empty string input', () => {
    const result = parseEmailHeader('')
    expect(result).toEqual([])
  })

  it('should handle whitespace-only input', () => {
    const result = parseEmailHeader('  \t\n  ')
    expect(result).toEqual([])
  })

  it('should parse a single plain email address', () => {
    const result = parseEmailHeader('test@example.com')
    expect(result).toEqual([
      {
        email: 'test@example.com',
        firstName: 'test@example.com',
        lastName: ''
      }
    ])
  })

  it('should parse a single email with name in angle brackets', () => {
    const result = parseEmailHeader('John Doe <john.doe@example.com>')
    expect(result).toEqual([
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }
    ])
  })

  it('should parse a single email with quoted name in angle brackets', () => {
    const result = parseEmailHeader('"John Doe" <john.doe@example.com>')
    expect(result).toEqual([
      {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }
    ])
  })

  it('should parse a single email with multi-word last name', () => {
    const result = parseEmailHeader('John Doe Smith <john.doe@example.com>')
    expect(result).toEqual([
      {
        email: 'john.doe@example.com',
        firstName: 'John Doe Smith',
        lastName: ''
      }
    ])
  })

  it('should parse multiple plain email addresses', () => {
    const result = parseEmailHeader('test1@example.com, test2@example.com')
    expect(result).toEqual([
      {
        email: 'test1@example.com',
        firstName: 'test1@example.com',
        lastName: ''
      },
      {
        email: 'test2@example.com',
        firstName: 'test2@example.com',
        lastName: ''
      }
    ])
  })

  it('should parse multiple email addresses with names', () => {
    const result = parseEmailHeader('John <john@example.com>, Jane Doe <jane@example.com>')
    expect(result).toEqual([
      {
        email: 'john@example.com',
        firstName: 'John',
        lastName: ''
      },
      {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe'
      }
    ])
  })

  it('should handle commas within quoted names', () => {
    const result = parseEmailHeader('"Doe, John" <john@example.com>, Jane Doe <jane@example.com>')
    expect(result).toEqual([
      {
        email: 'john@example.com',
        firstName: 'Doe',
        lastName: 'John'
      },
      {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe'
      }
    ])
  })

  it('should handle mixed format addresses', () => {
    const result = parseEmailHeader('john@example.com, Jane Doe <jane@example.com>')
    expect(result).toEqual([
      {
        email: 'john@example.com',
        firstName: 'john@example.com',
        lastName: ''
      },
      {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe'
      }
    ])
  })

  it('should handle email addresses with no name part', () => {
    const result = parseEmailHeader('<john@example.com>, <jane@example.com>')
    expect(result).toEqual([
      {
        email: 'john@example.com',
        firstName: 'john@example.com',
        lastName: ''
      },
      {
        email: 'jane@example.com',
        firstName: 'jane@example.com',
        lastName: ''
      }
    ])
  })

  it('should handle extra whitespace between addresses', () => {
    const result = parseEmailHeader('john@example.com ,  Jane Doe <jane@example.com>')
    expect(result).toEqual([
      {
        email: 'john@example.com',
        firstName: 'john@example.com',
        lastName: ''
      },
      {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe'
      }
    ])
  })

  it('should handle the example from the prompt', () => {
    const result = parseEmailHeader('example staff <example-staff@example.com>, personnel <personnel@example.com>')
    expect(result).toEqual([
      {
        email: 'example-staff@example.com',
        firstName: 'example',
        lastName: 'staff'
      },
      {
        email: 'personnel@example.com',
        firstName: 'personnel',
        lastName: ''
      }
    ])
  })

  it('should handle another example from the prompt', () => {
    const result = parseEmailHeader('abc@test.com, 123@test.com')
    expect(result).toEqual([
      {
        email: 'abc@test.com',
        firstName: 'abc@test.com',
        lastName: ''
      },
      {
        email: '123@test.com',
        firstName: '123@test.com',
        lastName: ''
      }
    ])
  })

  it('should handle addresses with trailing comma', () => {
    const result = parseEmailHeader('John <john@example.com>, Jane <jane@example.com>')
    expect(result).toEqual([
      {
        email: 'john@example.com',
        firstName: 'John',
        lastName: ''
      },
      {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: ''
      }
    ])
  })

  it('should handle empty addresses between commas', () => {
    const result = parseEmailHeader('John <john@example.com>, , Jane <jane@example.com>')
    expect(result).toEqual([
      {
        email: 'john@example.com',
        firstName: 'John',
        lastName: ''
      },
      {
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: ''
      }
    ])
  })
})
