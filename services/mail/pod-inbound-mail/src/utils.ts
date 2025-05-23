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
import { randomUUID } from 'crypto'
import { readEml, ReadedEmlJson } from 'eml-parse-js'
import TurndownService from 'turndown'
import sanitizeHtml from 'sanitize-html'
import { MeasureContext } from '@hcengineering/core'
import {
  type Attachment
} from '@hcengineering/mail-common'

import { MtaMessage } from './types'
import config from './config'

export async function parseContent (
  ctx: MeasureContext,
  mta: MtaMessage
): Promise<{ content: string, attachments: Attachment[] }> {
  const contentType = getHeader(mta, 'Content-Type')
  if (contentType === undefined) {
    throw new Error('Content-Type header not found')
  }

  if (contentType.toLowerCase().startsWith('text/plain')) {
    return { content: mta.message.contents, attachments: [] }
  }

  const email = await getEmailContent(mta.message.contents)

  let content = email.text ?? ''
  console.log('Content:', content)
  let isMarkdown = false
  if (email.html !== undefined) {
    try {
      const html = sanitizeHtml(email.html)
      const tds = new TurndownService()
      content = tds.turndown(html)
      console.log('HTML Content:', content)

      isMarkdown = true
    } catch (error) {
      ctx.warn('Failed to parse html content', { error })
    }
  }

  const attachments: Attachment[] = []
  if (config.storageConfig !== undefined) {
    for (const a of email.attachments ?? []) {
      if (a.name === undefined || a.name.length === 0) {
        // EML parser returns attachments with empty name for parts of content
        // that do not have "Content-Disposition: attachment" e.g. for part
        // Content-Type: text/calendar; charset="UTF-8"; method=REQUEST
        continue
      }
      const attachment: Attachment = {
        id: randomUUID(),
        name: a.name,
        data: Buffer.from(a.data64, 'base64'),
        contentType: a.contentType.split(';')[0].trim()
      }
      attachments.push(attachment)

      // For inline images, replace the CID references with the blob id
      if (isMarkdown && a.inline && a.id !== undefined) {
        const cid = a.id.replace(/[<>]/g, '')
        content = content.replaceAll(
          new RegExp(`!\\[.*?\\]\\(cid:${cid}\\)`, 'g'),
          `![${a.name}](cid:${attachment.id})`
        )
      }
    }
  }
  return { content, attachments }
}

export function getHeader (mta: MtaMessage, header: string): string | undefined {
  const h = header.toLowerCase()
  return mta.message.headers.find((header) => header[0].toLowerCase() === h)?.[1]?.trim()
}

async function getEmailContent (mtaContent: string): Promise<ReadedEmlJson> {
  if (mtaContent == null) {
    return {
      text: '',
      html: '',
      attachments: []
    } as any
  }
  const contentRegex = /Content-Type/i
  const content = contentRegex.test(mtaContent)
    ? mtaContent
    : `Content-Type: ${guessContentType(mtaContent)}\r\n${mtaContent}`
  const email = await new Promise<ReadedEmlJson>((resolve, reject) => {
    readEml(content, (err, json) => {
      if (err !== undefined && err !== null) {
        reject(new Error(`Email parsing error: ${err.message}`))
      } else if (json === undefined) {
        reject(new Error('Email parser returned undefined result'))
      } else {
        resolve(json)
      }
    })
  })
  if (isEmptyString(email.text) && isEmptyString(email.html)) {
    return {
      ...email,
      text: mtaContent
    }
  }
  return email
}

function guessContentType (content: string): string {
  // Simple heuristic - if it contains HTML tags, it's likely HTML
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return 'text/html; charset="UTF-8"'
  }
  return 'text/plain; charset="UTF-8"'
}

function isEmptyString (str: string | undefined): boolean {
  return str == null || str.trim() === ''
}
