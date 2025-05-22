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
import sanitizeHtml from 'sanitize-html'
import { MeasureContext } from '@hcengineering/core'
import {
  type Attachment,
  type EmailContact,
  type EmailMessage,
  createMessages,
  getProducer
} from '@hcengineering/mail-common'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'

import { mailServiceToken, baseConfig, kvsClient } from './client'
import config from './config'

export interface MtaMessage {
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

function getHeader (mta: MtaMessage, header: string): string | undefined {
  const h = header.toLowerCase()
  return mta.message.headers.find((header) => header[0].toLowerCase() === h)?.[1]?.trim()
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

    const from: EmailContact = getEmailContact(mta.envelope.from.address)
    if (config.ignoredAddresses.includes(from.email)) {
      return
    }
    const fromHeader = getHeader(mta, 'From')
    if (fromHeader !== undefined) {
      const { firstName, lastName } = extractContactName(ctx, fromHeader, from.email)
      from.firstName = firstName
      from.lastName = lastName
    }

    const tos: EmailContact[] = mta.envelope.to.map((to) => getEmailContact(stripTags(to.address)))
    const toHeader = getHeader(mta, 'To')
    if (toHeader !== undefined) {
      for (const part of toHeader.split(',')) {
        for (const to of tos) {
          if (part.includes(to.email)) {
            const { firstName, lastName } = extractContactName(ctx, part, to.email)
            to.firstName = firstName
            to.lastName = lastName
          }
        }
      }
    }

    const subject = getHeader(mta, 'Subject') ?? ''
    const inReplyTo = getHeader(mta, 'In-Reply-To')
    const { content, attachments } = await parseContent(ctx, mta)

    let mailId = getHeader(mta, 'Message-ID')
    if (mailId === undefined) {
      mailId = createHash('sha256')
        .update(
          JSON.stringify({
            from: from.email,
            to: tos.map((to) => to.email),
            subject,
            content
          })
        )
        .digest('hex')
    }
    const date = Date.now()
    const convertedMessage: EmailMessage = {
      mailId,
      from,
      to: tos,
      subject,
      content,
      textContent: content,
      replyTo: inReplyTo,
      incoming: true,
      modifiedOn: date,
      sendOn: date
    }

    const accountClient = getAccountClient(config.accountsUrl, mailServiceToken)
    const wsInfo = await accountClient.selectWorkspace(config.workspaceUrl)
    const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
    const txClient = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)

    await createMessages(
      baseConfig,
      ctx,
      txClient,
      kvsClient,
      await getProducer(baseConfig.CommunicationTopic),
      mailServiceToken,
      wsInfo,
      convertedMessage,
      attachments
    )
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
  const contentType = getHeader(mta, 'Content-Type')
  if (contentType === undefined) {
    throw new Error('Content-Type header not found')
  }

  if (contentType.toLowerCase().startsWith('text/plain')) {
    return { content: mta.message.contents, attachments: [] }
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
      const html = sanitizeHtml(email.html)
      const tds = new TurndownService()
      content = tds.turndown(html)
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

function getEmailContact (email: string): EmailContact {
  const parts = stripTags(email).split('@')
  return {
    email,
    firstName: parts[0],
    lastName: parts[1]
  }
}

function extractContactName (
  ctx: MeasureContext,
  fromHeader: string,
  email: string
): { firstName: string, lastName: string } {
  // Match name part that appears before an email in angle brackets
  const nameMatch = fromHeader.match(/^\s*"?([^"<]+?)"?\s*<.+?>/)
  const encodedName = nameMatch?.[1].trim() ?? ''
  const name = encodedName.length > 0 ? decodeMimeWord(ctx, encodedName) : ''
  let [firstName, lastName] = name.split(' ')
  if (firstName === undefined || firstName.length === 0) {
    firstName = email.split('@')[0]
  }
  if (lastName === undefined || lastName.length === 0) {
    lastName = email.split('@')[1]
  }
  return { firstName, lastName }
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
