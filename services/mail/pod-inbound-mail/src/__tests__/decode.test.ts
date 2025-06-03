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
import { decodeContent, decodeEncodedWords } from '../decode'
import { MeasureContext } from '@hcengineering/core'

jest.mock(
  '../config',
  () => ({
    hookToken: 'test-hook-token',
    ignoredAddresses: ['ignored@example.com'],
    storageConfig: 'test-storage-config',
    workspaceUrl: 'test-workspace'
  }),
  { virtual: true }
)

const mockCtx: MeasureContext = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
} as any

describe('decodeContent', () => {
  test('should return original content when encoding is undefined', () => {
    const content = 'Hello World'
    const result = decodeContent(mockCtx, content, undefined)
    expect(result).toBe(content)
  })

  test('should return original content when encoding is empty string', () => {
    const content = 'Hello World'
    const result = decodeContent(mockCtx, content, '')
    expect(result).toBe(content)
  })

  test('should decode base64 content', () => {
    const base64Content = 'SGVsbG8gV29ybGQ=' // "Hello World" in base64
    const result = decodeContent(mockCtx, base64Content, 'base64')
    expect(result).toBe('Hello World')
  })

  test('should decode base64 content with case insensitive encoding', () => {
    const base64Content = 'SGVsbG8gV29ybGQ='
    const result = decodeContent(mockCtx, base64Content, 'BASE64')
    expect(result).toBe('Hello World')
  })

  test('should decode quoted-printable content', () => {
    const qpContent = 'Hello=20World=21'
    const result = decodeContent(mockCtx, qpContent, 'quoted-printable')
    expect(result).toBe('Hello World!')
  })

  test('should handle quoted-printable with soft line breaks', () => {
    const qpContent = 'This is a very long line that needs=\r\nto be wrapped'
    const result = decodeContent(mockCtx, qpContent, 'quoted-printable')
    expect(result).toBe('This is a very long line that needsto be wrapped')
  })

  test('should return original content for 7bit encoding', () => {
    const content = 'Plain text content'
    const result = decodeContent(mockCtx, content, '7bit')
    expect(result).toBe(content)
  })

  test('should return original content for 8bit encoding', () => {
    const content = 'Plain text with émojis 🎉'
    const result = decodeContent(mockCtx, content, '8bit')
    expect(result).toBe(content)
  })

  test('should return original content for binary encoding', () => {
    const content = 'Binary content'
    const result = decodeContent(mockCtx, content, 'binary')
    expect(result).toBe(content)
  })

  test('should return original content for unknown encoding', () => {
    const content = 'Unknown encoding content'
    const result = decodeContent(mockCtx, content, 'unknown-encoding')
    expect(result).toBe(content)
  })
})

describe('decodeEncodedWords', () => {
  test('should return original text when no encoded words present', () => {
    const text = 'Plain text without encoding'
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe(text)
  })

  test('should decode base64 encoded word', () => {
    const text = '=?utf-8?B?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should decode quoted-printable encoded word', () => {
    const text = '=?utf-8?Q?Hello=20World?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should decode quoted-printable with underscores as spaces', () => {
    const text = '=?utf-8?Q?Hello_World?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle multiple encoded words in same text', () => {
    const text = '=?utf-8?B?SGVsbG8=?= =?utf-8?B?V29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle mixed encoded and plain text', () => {
    const text = 'Subject: =?utf-8?B?SGVsbG8=?= from sender'
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Subject: Hello from sender')
  })

  test('should handle case insensitive encoding (lowercase b)', () => {
    const text = '=?utf-8?b?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle case insensitive encoding (lowercase q)', () => {
    const text = '=?utf-8?q?Hello_World?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle unknown encoding gracefully', () => {
    const text = '=?utf-8?X?unknown?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe(text) // Should return original
  })

  test('should decode real-world email subject', () => {
    const text = '=?UTF-8?B?8J+OiSBXZWxjb21lIHRvIG91ciBwbGF0Zm9ybSE=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('🎉 Welcome to our platform!')
  })

  test('should handle empty encoded text', () => {
    const text = '=?utf-8?B??='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('')
  })

  test('should handle different charset - ISO-8859-1', () => {
    const text = '=?iso-8859-1?B?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle different charset - latin1', () => {
    const text = '=?latin1?B?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle different charset - windows-1252', () => {
    const text = '=?windows-1252?B?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle ASCII charset', () => {
    const text = '=?us-ascii?B?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle case insensitive charset names', () => {
    const text = '=?UTF-8?B?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle charset with whitespace', () => {
    const text = '=? utf-8 ?B?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should default to utf8 for unsupported charset', () => {
    const text = '=?gb2312?B?SGVsbG8gV29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World') // Should still decode as utf8
  })

  test('should handle mixed charsets in same text', () => {
    const text = '=?utf-8?B?SGVsbG8=?= =?iso-8859-1?B?V29ybGQ=?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('Hello World')
  })

  test('should handle quoted-printable with different charset', () => {
    const text = '=?iso-8859-1?Q?caf=E9?='
    const result = decodeEncodedWords(mockCtx, text)
    expect(result).toBe('café')
  })

  test('should handle error in charset conversion gracefully', () => {
    const consoleSpy = jest.spyOn(mockCtx, 'warn')
    // This might cause an encoding issue depending on the content
    const text = '=?invalid-charset?B?invalid-content?='

    const result = decodeEncodedWords(mockCtx, text)

    // Should either decode successfully with fallback or return original
    expect(typeof result).toBe('string')

    consoleSpy.mockRestore()
  })
})
