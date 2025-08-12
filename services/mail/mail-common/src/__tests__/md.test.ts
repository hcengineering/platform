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
import { markdownToHtml, markdownToText } from '../md'
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

describe('markdownToHtml', () => {
  it('should convert simple markdown to HTML', async () => {
    const markdown = '# Hello World\n\nThis is **bold** text.'
    const result = markdownToHtml(markdown)

    expect(result).toContain('<h1>Hello World</h1>')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<p>This is')
  })

  it('should handle empty string', async () => {
    const result = markdownToHtml('')
    expect(result).toBe('')
  })

  it('should handle non-string input gracefully', async () => {
    const result = markdownToHtml(null as any)
    expect(result).toBe('')
  })

  it('should enable linkify by default (GFM-like behavior)', async () => {
    const markdown = 'Visit https://example.com for more info'
    const result = markdownToHtml(markdown)

    expect(result).toContain('<a href="https://example.com">https://example.com</a>')
  })

  it('should handle line breaks when enabled', async () => {
    const markdown = 'Line 1\nLine 2'
    const result = markdownToHtml(markdown, { breaks: true })

    expect(result).toContain('<br>')
  })

  it('should disable linkify when GFM is disabled', async () => {
    const markdown = 'Visit https://example.com for more info'
    const result = markdownToHtml(markdown, { gfm: false })

    // Without GFM (linkify), URLs should not be converted to links
    expect(result).not.toContain('<a href="https://example.com">')
    expect(result).toContain('https://example.com')
  })

  it('should handle markdown with links', async () => {
    const markdown = '[Google](https://google.com)'
    const result = markdownToHtml(markdown)

    expect(result).toContain('<a href="https://google.com">Google</a>')
  })

  it('should handle markdown with code blocks', async () => {
    const markdown = '```javascript\nconsole.log("hello");\n```'
    const result = markdownToHtml(markdown)

    expect(result).toContain('<pre>')
    expect(result).toContain('<code')
    expect(result).toContain('console.log')
  })

  it('should handle inline code', async () => {
    const markdown = 'Use `console.log()` for debugging'
    const result = markdownToHtml(markdown)

    expect(result).toContain('<code>console.log()</code>')
  })

  it('should handle lists', async () => {
    const markdown = '- Item 1\n- Item 2\n- Item 3'
    const result = markdownToHtml(markdown)

    expect(result).toContain('<ul>')
    expect(result).toContain('<li>Item 1</li>')
    expect(result).toContain('<li>Item 2</li>')
    expect(result).toContain('<li>Item 3</li>')
  })

  it('should handle ordered lists', async () => {
    const markdown = '1. First\n2. Second\n3. Third'
    const result = markdownToHtml(markdown)

    expect(result).toContain('<ol>')
    expect(result).toContain('<li>First</li>')
    expect(result).toContain('<li>Second</li>')
    expect(result).toContain('<li>Third</li>')
  })

  it('should handle special characters in markdown', async () => {
    const markdown = 'Text with & < > " \' characters'
    const result = markdownToHtml(markdown)

    // markdown-it encodes single quotes as ' instead of &#x27;
    expect(result).toContain("<p>Text with &amp; &lt; &gt; &quot; ' characters</p>")
  })
})

describe('markdownToText', () => {
  it('should convert markdown to plain text', async () => {
    const markdown = '# Hello World\n\nThis is **bold** text with [a link](https://example.com).'
    const result = markdownToText(markdown)

    expect(result).toBe('Hello World\nThis is bold text with a link.')
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
    expect(result).not.toContain('**')
    expect(result).not.toContain('#')
  })

  it('should handle empty string', async () => {
    const result = markdownToText('')
    expect(result).toBe('')
  })

  it('should handle non-string input gracefully', async () => {
    const result = markdownToText(undefined as any)
    expect(result).toBe('')
  })

  it('should remove HTML tags from converted markdown', async () => {
    const markdown = '**Bold** and *italic* text'
    const result = markdownToText(markdown)

    expect(result).toBe('Bold and italic text')
    expect(result).not.toContain('<strong>')
    expect(result).not.toContain('<em>')
  })

  it('should handle complex markdown with multiple elements', async () => {
    const markdown = `
# Title

## Subtitle

- List item 1
- List item 2

> Blockquote text

\`inline code\`

[Link text](https://example.com)
    `.trim()

    const result = markdownToText(markdown)

    expect(result).toContain('Title')
    expect(result).toContain('Subtitle')
    expect(result).toContain('List item 1')
    expect(result).toContain('List item 2')
    expect(result).toContain('Blockquote text')
    expect(result).toContain('inline code')
    expect(result).toContain('Link text')

    // Should not contain HTML tags
    expect(result).not.toContain('<')
    expect(result).not.toContain('>')
  })

  it('should trim whitespace from converted text', async () => {
    const markdown = '   # Title   \n\n   Content   '
    const result = markdownToText(markdown)

    expect(result.trim()).toBe('Title\nContent')
    expect(result.startsWith(' ')).toBe(false)
    expect(result.endsWith(' ')).toBe(false)
  })
})
