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

import { parseContent, getHeader, removeContentTypeHeader } from '../utils'
import { MeasureContext } from '@hcengineering/core'
import { MtaMessage } from '../types'
import { readEml } from 'eml-parse-js'

// Mock dependencies
jest.mock('eml-parse-js')
jest.mock('sanitize-html', () => (html: string) => html)
jest.mock('turndown', () => {
  return class TurndownService {
    turndown (html: string): string {
      return html.replace(/<\/?[^>]+(>|$)/g, '') // Simple HTML tag removal
    }
  }
})
jest.mock('../config', () => ({
  __esModule: true,
  default: {
    storageConfig: {}
  }
}))

describe('utils.ts', () => {
  let mockCtx: MeasureContext

  beforeEach(() => {
    jest.clearAllMocks()
    mockCtx = {
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn()
    } as unknown as MeasureContext

    // Default mock implementation for readEml
    ;(readEml as jest.Mock).mockImplementation((content, callback) => {
      callback(null, {
        text: 'Plain text content',
        html: '<p>HTML content</p>',
        attachments: []
      })
    })
  })

  describe('parseContent', () => {
    it('should handle plain text emails', async () => {
      // Arrange
      const plainTextMessage: MtaMessage = {
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }]
        },
        message: {
          headers: [['Content-Type', 'text/plain; charset=utf-8']],
          contents: 'This is a plain text email'
        }
      }

      // Act
      const result = await parseContent(mockCtx, plainTextMessage)

      // Assert
      expect(result).toEqual({
        content: 'This is a plain text email',
        attachments: []
      })
      expect(readEml).not.toHaveBeenCalled()
    })

    it('should handle HTML emails', async () => {
      // Arrange
      const htmlMessage: MtaMessage = {
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }]
        },
        message: {
          headers: [['Content-Type', 'text/html; charset=utf-8']],
          contents: '<html><body><p>This is an HTML email</p></body></html>'
        }
      } as any

      // Mock readEml to return HTML content
      ;(readEml as jest.Mock).mockImplementation((content, callback) => {
        callback(null, {
          text: '',
          html: '<p>This is an HTML email</p>',
          attachments: []
        })
      })

      // Act
      const result = await parseContent(mockCtx, htmlMessage)

      // Assert
      expect(result).toEqual({
        content: 'This is an HTML email',
        attachments: []
      })
    })

    it('should handle multipart emails with text and HTML parts', async () => {
      // Arrange
      const multipartMessage: MtaMessage = {
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }]
        },
        message: {
          headers: [['Content-Type', 'multipart/alternative; boundary="boundary"']],
          contents:
            '--boundary\r\nContent-Type: text/plain\r\n\r\nText part\r\n--boundary\r\nContent-Type: text/html\r\n\r\n<p>HTML part</p>\r\n--boundary--'
        }
      } as any

      // Mock readEml to return both text and HTML content
      ;(readEml as jest.Mock).mockImplementation((content, callback) => {
        callback(null, {
          text: 'Text part',
          html: '<p>HTML part</p>',
          attachments: []
        })
      })

      // Act
      const result = await parseContent(mockCtx, multipartMessage)

      // Assert
      expect(result).toEqual({
        content: 'HTML part',
        attachments: []
      })
    })

    it('should throw error when Content-Type header is not found', async () => {
      // Arrange
      const messageWithNoContentType: MtaMessage = {
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }]
        },
        message: {
          headers: [['Subject', 'Test Email']],
          contents: 'Email content'
        }
      }

      // Act & Assert
      await expect(parseContent(mockCtx, messageWithNoContentType)).rejects.toThrow('Content-Type header not found')
    })
  })

  describe('getHeader', () => {
    it('should return the value of the specified header', () => {
      // Arrange
      const message: MtaMessage = {
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }]
        },
        message: {
          headers: [
            ['Subject', 'Test Email'],
            ['Content-Type', 'text/plain'],
            ['X-Custom-Header', 'Custom Value']
          ],
          contents: 'Email content'
        }
      }

      // Act & Assert
      expect(getHeader(message, 'Subject')).toBe('Test Email')
      expect(getHeader(message, 'Content-Type')).toBe('text/plain')
      expect(getHeader(message, 'X-Custom-Header')).toBe('Custom Value')
    })

    it('should be case-insensitive when looking for headers', () => {
      // Arrange
      const message: MtaMessage = {
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }]
        },
        message: {
          headers: [
            ['Subject', 'Test Email'],
            ['Content-Type', 'text/plain']
          ],
          contents: 'Email content'
        }
      }

      // Act & Assert
      expect(getHeader(message, 'subject')).toBe('Test Email')
      expect(getHeader(message, 'CONTENT-TYPE')).toBe('text/plain')
    })

    it('should return undefined for non-existent headers', () => {
      // Arrange
      const message: MtaMessage = {
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }]
        },
        message: {
          headers: [['Subject', 'Test Email']],
          contents: 'Email content'
        }
      }

      // Act & Assert
      expect(getHeader(message, 'X-Not-Exists')).toBeUndefined()
    })

    it('should trim the header value', () => {
      // Arrange
      const message: MtaMessage = {
        envelope: {
          from: { address: 'sender@example.com' },
          to: [{ address: 'recipient@example.com' }]
        },
        message: {
          headers: [['Subject', '  Test Email  ']],
          contents: 'Email content'
        }
      }

      // Act & Assert
      expect(getHeader(message, 'Subject')).toBe('Test Email')
    })
  })

  describe('removeContentTypeHeader', () => {
    it('should remove Content-Type header from content', () => {
      // Arrange
      const content = 'Content-Type: text/plain; charset=utf-8\r\nHello world'

      // Act
      const result = removeContentTypeHeader(content)

      // Assert
      expect(result).toBe('Hello world')
    })

    it('should handle content with no Content-Type header', () => {
      // Arrange
      const content = 'Hello world'

      // Act
      const result = removeContentTypeHeader(content)

      // Assert
      expect(result).toBe('Hello world')
    })

    it('should handle content with Content-Type header in different case', () => {
      // Arrange
      const content = 'content-type: text/plain; charset=utf-8\r\nHello world'

      // Act
      const result = removeContentTypeHeader(content)

      // Assert
      expect(result).toBe('Hello world')
    })

    it('should handle content with multiple headers', () => {
      // Arrange
      const content =
        'Subject: Test Email\r\nContent-Type: text/plain; charset=utf-8\r\nFrom: test@example.com\r\n\r\nHello world'

      // Act
      const result = removeContentTypeHeader(content)

      // Assert
      expect(result).toBe('Subject: Test Email\r\nFrom: test@example.com\r\n\r\nHello world')
    })

    it('should handle null or undefined content', () => {
      // Act & Assert
      expect(removeContentTypeHeader(null as any)).toBeNull()
      expect(removeContentTypeHeader(undefined as any)).toBeUndefined()
    })

    it('should handle different line endings', () => {
      // Arrange
      const crlfContent = 'Content-Type: text/plain\r\nHello world'
      const lfContent = 'Content-Type: text/plain\nHello world'
      const crContent = 'Content-Type: text/plain\rHello world'

      // Act & Assert
      expect(removeContentTypeHeader(crlfContent)).toBe('Hello world')
      expect(removeContentTypeHeader(lfContent)).toBe('Hello world')
      expect(removeContentTypeHeader(crContent)).toBe('Hello world')
    })
  })
})
