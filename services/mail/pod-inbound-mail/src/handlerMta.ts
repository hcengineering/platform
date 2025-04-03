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
import { createHash, randomUUID } from 'crypto'
import { readEml, ReadedEmlJson } from 'eml-parse-js'
import { Request, Response } from 'express'
import TurndownService from 'turndown'
import DOMPurify from 'isomorphic-dompurify'
import { MeasureContext } from '@hcengineering/core'
import { type Attachment, createMessages } from './message'
import config from './config'

interface MtaMessage {
  envelope: {
    from: {
      address: string
    }
    to: {
      address: string
    }[]
  }
  message: {
    headers: string[][]
    contents: string
  }
}

export async function handleMtaHook (req: Request, res: Response, ctx: MeasureContext): Promise<void> {
  try {
    if (config.hookToken !== undefined) {
      const token = req.headers['x-hook-token']
      if (token !== config.hookToken) {
        throw new Error('Invalid hook token')
      }
    }

    const mta: MtaMessage = req.body

    const from = { address: mta.envelope.from.address, name: '' }
    if (config.ignoredAddresses.includes(from.address)) {
      return
    }
    const fromHeader = mta.message.headers.find((header) => header[0] === 'From')?.[1]
    if (fromHeader !== undefined) {
      from.name = extractContactName(ctx, fromHeader)
    }

    const tos = mta.envelope.to.map((to) => ({ address: stripTags(to.address), name: '' }))
    const toHeader = mta.message.headers.find((header) => header[0] === 'To')?.[1]
    if (toHeader !== undefined) {
      for (const part of toHeader.split(',')) {
        for (const to of tos) {
          if (part.includes(to.address)) {
            to.name = extractContactName(ctx, part)
          }
        }
      }
    }

    const subject = (mta.message.headers.find((header) => header[0] === 'Subject')?.[1] ?? '').trim()
    const inReplyTo = mta.message.headers.find((header) => header[0] === 'In-Reply-To')?.[1]?.trim()
    const { content, attachments } = await parseContent(ctx, mta)

    let mailId = mta.message.headers.find((header) => header[0] === 'Message-ID')?.[1].trim()
    if (mailId === undefined) {
      mailId = createHash('sha256')
        .update(
          JSON.stringify({
            from: from.address,
            to: tos.map((to) => to.address),
            subject,
            content
          })
        )
        .digest('hex')
    }

    await createMessages(ctx, mailId, from, tos, subject, content, attachments, inReplyTo)
  } catch (error) {
    ctx.error('mta-hook', { error })
  } finally {
    // Any error in the mta-hook should not prevent the mail server from handling emails
    res.status(200).send({ action: 'accept' })
  }
}

async function parseContent (
  ctx: MeasureContext,
  mta: MtaMessage
): Promise<{ content: string, attachments: Attachment[] }> {
  const contentType = mta.message.headers.find((header) => header[0] === 'Content-Type')?.[1]
  if (contentType === undefined) {
    throw new Error('Content-Type header not found')
  }
  const contents = `Content-Type: ${contentType}\r\n${mta.message.contents}`
  const email = await new Promise<ReadedEmlJson>((resolve, reject) => {
    readEml(contents, (err, json) => {
      if (err !== undefined && err !== null) {
        reject(err)
      } else if (json === undefined) {
        reject(new Error('Failed to parse email'))
      } else {
        resolve(json)
      }
    })
  })

  let content = email.text ?? ''
  let isMarkdown = false
  if (email.html !== undefined) {
    try {
      const html = DOMPurify.sanitize(email.html)
      const tds = new TurndownService()
      content = tds.turndown(html)
      isMarkdown = true
      console.log('Markdown:\n', content)
    } catch (error) {
      ctx.warn('Failed to parse html content', { error })
    }
  }

  const attachments: Attachment[] = []
  if (config.storageConfig !== undefined) {
    for (const a of email.attachments ?? []) {
      console.log('Attachment', a)
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

function extractContactName (ctx: MeasureContext, fromHeader: string): string {
  // Match name part that appears before an email in angle brackets
  const nameMatch = fromHeader.match(/^\s*"?([^"<]+?)"?\s*<.+?>/)
  const name = nameMatch?.[1].trim() ?? ''
  if (name.length > 0) {
    return decodeMimeWord(ctx, name)
  }
  return ''
}

function decodeMimeWord (ctx: MeasureContext, text: string): string {
  return text.replace(/=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi, (match, charset, encoding, content) => {
    try {
      if (encoding.toUpperCase() === 'B') {
        // Base64 encoding
        const buffer = Buffer.from(content, 'base64')
        return buffer.toString(charset as BufferEncoding)
      } else if (encoding.toUpperCase() === 'Q') {
        // Quoted-printable encoding
        const decoded = content
          .replace(/_/g, ' ')
          .replace(/=([0-9A-F]{2})/gi, (_: any, hex: string) => String.fromCharCode(parseInt(hex, 16)))
        return Buffer.from(decoded).toString(charset as BufferEncoding)
      }
      return match
    } catch (error) {
      ctx.warn('Failed to decode encoded word', { error })
      return match
    }
  })
}

function stripTags (email: string): string {
  const [name, domain] = email.split('@')
  const tagStart = name.indexOf('+')
  if (tagStart === -1) {
    return email
  }
  const clearName = name.substring(0, tagStart)
  return `${clearName}@${domain}`
}
