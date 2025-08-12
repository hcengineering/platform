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

import fs from 'fs/promises'
import path from 'path'
import { MeasureContext } from '@hcengineering/core'
import { type MtaMessage } from '../types'

// Create a mock logger context
const mockContext = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as MeasureContext

describe('parseContent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should parse email with attachment', async () => {
    const { parseContent } = await import('../utils')
    const attachmentEml = await fs.readFile(path.join(__dirname, '__mocks__/attachment.txt'), 'utf-8')
    // Create MTA message from the sample email file
    const mtaMessage: MtaMessage = {
      envelope: {
        from: { address: 'test1@example.com' },
        to: [{ address: 'test2@example.com' }]
      },
      message: {
        headers: [['Content-Type', 'multipart/mixed; boundary="000000000000384e1705e9d0930b"']],
        contents: attachmentEml
      }
    }

    const result = await parseContent(mockContext, mtaMessage)

    // Verify content was parsed
    expect(result.content).toContain('Attached huly.png')

    // Verify attachment was extracted
    expect(result.attachments.length).toBe(1)

    // Check attachment properties
    const attachment = result.attachments[0]
    expect(attachment).toHaveProperty('id')
    expect(attachment).toHaveProperty('name')
    expect(attachment).toHaveProperty('data')
    expect(attachment).toHaveProperty('contentType')

    // Verify attachment data is a Buffer
    expect(Buffer.isBuffer(attachment.data)).toBe(true)
    expect(attachment.name).toBe('huly.png')
  })

  test('should parse email with 2 attachments', async () => {
    const { parseContent } = await import('../utils')
    const attachmentEml = await fs.readFile(path.join(__dirname, '__mocks__/2attachments.txt'), 'utf-8')
    // Create MTA message from the sample email file
    const mtaMessage: MtaMessage = {
      envelope: {
        from: { address: 'test1@example.com' },
        to: [{ address: 'test2@example.com' }]
      },
      message: {
        headers: [['Content-Type', 'multipart/mixed; boundary="00000000000016290e0636150598"']],
        contents: attachmentEml
      }
    }

    const result = await parseContent(mockContext, mtaMessage)

    // Verify content was parsed
    expect(result.content).toContain('Send huly.png and cat.png')

    // Verify attachment was extracted
    expect(result.attachments.length).toBe(2)

    // Check attachment properties
    const attachment = result.attachments[0]
    expect(attachment).toHaveProperty('id')
    expect(attachment).toHaveProperty('name')
    expect(attachment).toHaveProperty('data')
    expect(attachment).toHaveProperty('contentType')

    // Verify attachment data is a Buffer
    expect(Buffer.isBuffer(attachment.data)).toBe(true)
    expect(attachment.name).toBe('huly.png')

    const catAttachment = result.attachments[1]
    // Verify attachment data is a Buffer
    expect(Buffer.isBuffer(catAttachment.data)).toBe(true)
    expect(catAttachment.name).toBe('cat.png')
  })
})
