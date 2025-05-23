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

import { MeasureContext } from '@hcengineering/core'
import fs from 'fs'
import path from 'path'

import { getMdContent } from '../utils'
import { EmailMessage } from '../types'

describe('getMdContent', () => {
  let mockCtx: MeasureContext
  let meetingHtml: string

  beforeEach(() => {
    // Setup mock context
    mockCtx = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    } as unknown as MeasureContext

    // Load the test HTML fixture
    meetingHtml = fs.readFileSync(path.join(__dirname, '__mocks__', 'meetingMail.html'), 'utf8')
  })

  it('should handle complex HTML emails with large guest lists', () => {
    // Create an email message with the meeting HTML
    const email: EmailMessage = {
      mailId: 'test-mail-id',
      from: { email: 'jane.smith@example.com', firstName: 'Jane', lastName: 'Smith' },
      to: [{ email: 'recipient@example.com', firstName: 'Recipient', lastName: '' }],
      copy: [],
      subject: 'Year End Meeting 2023',
      content: meetingHtml, // Using the sanitized meeting HTML
      textContent: 'Simple text content',
      sendOn: Date.now()
    } as any

    // Convert the HTML to Markdown
    const result = getMdContent(mockCtx, email)

    // Update verification to match the sanitized HTML content
    expect(result).toContain('Join Google Meet')
    expect(result).toContain('When')
    expect(result).toContain('Thursday, Dec 28, 2023')
    expect(result).toContain('Guests')
    expect(result).toContain('Jane Smith')
    expect(result).toContain('organizer')

    // Verify no warnings were logged
    expect(mockCtx.warn).not.toHaveBeenCalled()

    // Verify meeting link is preserved (updated to match sanitized link)
    expect(result).toContain('meet.google.com/abc-defg-hij')

    // Verify phone numbers are present
    expect(result).toContain('+1 234 567-8910')
    expect(result).toContain('PIN: 1234567891011')

    // Verify it's readable markdown, not HTML
    expect(result).not.toContain('<html>')
    expect(result).not.toContain('<body>')
    expect(result).not.toContain('<table')

    // Verify we have the expected guest entries
    expect(result).toContain('John Doe')
    expect(result).toContain('Sarah Jones')

    expect(result).toContain('[Yes](https://example.com/1)')
    expect(result).toContain('[No](https://example.com/2)')
    expect(result).toContain('[Maybe](https://example.com/3)')
  })

  it('should handle undefined content gracefully', () => {
    // Create an email message with undefined content
    const email: EmailMessage = {
      mailId: 'test-mail-id',
      from: { email: 'sender@example.com', firstName: 'Sender', lastName: '' },
      to: [{ email: 'recipient@example.com', firstName: 'Recipient', lastName: '' }],
      copy: [],
      subject: 'Test subject',
      content: undefined,
      textContent: 'Text only content',
      sendOn: Date.now()
    } as any

    // Should return text content when html content is undefined
    const result = getMdContent(mockCtx, email)
    expect(result).toBe('Text only content')
    expect(mockCtx.warn).not.toHaveBeenCalled()
  })

  it('should handle empty content properly', () => {
    // Create an email message with empty content
    const email: EmailMessage = {
      mailId: 'test-mail-id',
      from: { email: 'sender@example.com', firstName: 'Sender', lastName: '' },
      to: [{ email: 'recipient@example.com', firstName: 'Recipient', lastName: '' }],
      copy: [],
      subject: 'Test subject',
      content: '',
      textContent: '',
      sendOn: Date.now()
    } as any

    // Should handle empty content gracefully
    const result = getMdContent(mockCtx, email)
    expect(result).toBe('')
    expect(mockCtx.warn).not.toHaveBeenCalled()
  })
})
