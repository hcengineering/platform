//
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import TurndownService from 'turndown'
import sanitizeHtml from 'sanitize-html'
import { imageSize } from 'image-size'

import { BlobMetadata, MeasureContext } from '@hcengineering/core'
import {
  Attachment,
  EmailContact,
  EmailMessage,
  HulyMailHeader,
  HulyMessageIdHeader,
  HulyMessageTypeHeader,
  MailHeader
} from './types'
import { MessageExtra, MessageID } from '@hcengineering/communication-types'
import { CreateMessageEvent } from '@hcengineering/communication-sdk-types'
import { generateMessageId } from '@hcengineering/communication-shared'

const NAME_EMAIL_PATTERN = /^(?:"?([^"<]+)"?\s*)?<([^>]+)>$/
const NAME_SEGMENT_REGEX = /[\s,;]+/

export function getMdContent (ctx: MeasureContext, email: EmailMessage): string {
  if (email.content !== undefined) {
    try {
      const html = sanitizeHtml(email.content)
      const tds = new TurndownService()

      tds.addRule('links', {
        filter: 'a',
        replacement: function (content, node: Node) {
          try {
            const element = node as HTMLElement
            const href = element.getAttribute('href')
            const title = element.title ?? ''
            // Trim content to prevent empty lines inside links
            const trimmedContent = content.trim().replace(/\n\s*\n/g, ' ')
            if (href == null) {
              return trimmedContent
            }
            const titlePart = title !== '' ? ` "${title}"` : ''
            return `[${trimmedContent}](${href}${titlePart})`
          } catch (error: any) {
            ctx.warn('Failed to parse link', { error: error.message })
            return content
          }
        }
      })

      return tds.turndown(html)
    } catch (error) {
      ctx.warn('Failed to parse html content', { error })
    }
  }
  return email.textContent
}

/**
 * Parse email header into EmailContact objects
 * Supports both single and multiple addresses in formats like:
 * - "Name" <email@example.com>
 * - Name <email@example.com>
 * - email@example.com
 * - Multiple comma-separated addresses in any of the above formats
 *
 * @param headerValue Email header value to parse
 * @returns Array of EmailContact objects
 */
export function parseEmailHeader (headerValue: string | undefined): EmailContact[] {
  if (headerValue == null || headerValue.trim() === '') {
    return []
  }

  // Split the header by commas, but ignore commas inside quotes
  const regex = /,(?=(?:[^"]*"[^"]*")*[^"]*$)/
  const addresses = headerValue
    .split(regex)
    .map((addr) => addr.trim())
    .filter((addr) => addr !== '')

  return addresses.map((address) => parseNameFromEmailHeader(address))
}

export function parseNameFromEmailHeader (headerValue: string | undefined): EmailContact {
  if (headerValue == null || headerValue.trim() === '') {
    return {
      email: '',
      firstName: '',
      lastName: ''
    }
  }

  // Match pattern like: "Name" <email@example.com> or Name <email@example.com>
  const match = headerValue.trim().match(NAME_EMAIL_PATTERN)

  if (match == null) {
    const address = headerValue.trim()
    return {
      email: address,
      firstName: address,
      lastName: ''
    }
  }

  const displayName = match[1]?.trim()
  const email = match[2].trim()

  if (displayName == null || displayName === '') {
    return {
      email,
      firstName: email,
      lastName: ''
    }
  }
  const nameParts = displayName.split(NAME_SEGMENT_REGEX).filter((part) => part !== '')
  if (nameParts.length === 2) {
    return {
      email,
      firstName: nameParts[0],
      lastName: nameParts[1]
    }
  }
  return {
    email,
    firstName: displayName,
    lastName: ''
  }
}

export function normalizeEmail (email: string): string {
  return email.toLowerCase().trim()
}

export function getBlobMetadata (ctx: MeasureContext, attachment: Attachment): BlobMetadata | undefined {
  try {
    const dimensions = imageSize(attachment.data)
    return dimensions != null
      ? {
          originalHeight: dimensions.height,
          originalWidth: dimensions.width
        }
      : undefined
  } catch (error: any) {
    ctx.warn('Failed to get blob metadata', {
      error: error.message,
      attachmentId: attachment.id
    })
    return undefined
  }
}

// Define different time shifts for objects to ensure correct ordering
export enum MessageTimeShift {
  Channel = -6,
  MailTag = -5,
  ThreadCard = -4,
  Thread = -3,
  Collaborator = -2,
  Subject = -1
}

export function getMessageExtra (type: string, synced: boolean): MessageExtra {
  return {
    type,
    mailSynced: synced
  }
}

export function isSyncedMessage (message: CreateMessageEvent): boolean {
  return message.extra?.mailSynced ?? false
}

export function getReplySubject (threadName: string | undefined): string | undefined {
  if (threadName === undefined) {
    return undefined
  }

  const trimmedSubject = threadName.trim()
  if (trimmedSubject === '') {
    return undefined
  }

  // Check if subject already has a reply/forward prefix (case-insensitive)
  const replyPrefixes = /^(re|aw|sv|antw|resp):\s*/i
  const forwardPrefixes = /^(fwd?|fw|wg|tr|vs):\s*/i

  if (replyPrefixes.test(trimmedSubject) || forwardPrefixes.test(trimmedSubject)) {
    return trimmedSubject
  }

  return `Re: ${trimmedSubject}`
}

export function getMailHeaders (messageType: string, messageId?: string | undefined): string[] {
  const headers = [`${HulyMailHeader}: true\n`, `${HulyMessageTypeHeader}: ${messageType}\n`]
  if (messageId !== undefined) {
    headers.push(`${HulyMessageIdHeader}: ${messageId}\n`)
  }
  return headers
}

export function getMailHeadersRecord (
  messageType: string,
  messageId: string | undefined,
  email: string
): Record<string, string> {
  const headers: Record<string, string> = {
    [HulyMailHeader]: 'true',
    [HulyMessageTypeHeader]: messageType,
    [MailHeader.Id]: getEmailMessageIdFromHulyId(messageId, email)
  }
  if (messageId !== undefined) {
    headers[HulyMessageIdHeader] = messageId
  }
  return headers
}

export function isHulyMessage (headers: string[]): boolean {
  return headers.some(
    (header) =>
      header.startsWith(HulyMailHeader) ||
      header.startsWith(HulyMessageIdHeader) ||
      header.startsWith(HulyMessageTypeHeader)
  )
}

export function getDomainFromEmail (email: string): string {
  const atIndex = email.lastIndexOf('@')
  if (atIndex === -1) {
    throw new Error('Invalid email address')
  }
  return email.substring(atIndex + 1)
}

export function getEmailMessageIdFromHulyId (hulyId: string | undefined, email: string): string {
  const domain = getDomainFromEmail(email)
  const id = hulyId ?? generateMessageId()
  return `<${id}@${domain}>`
}

export function getHulyIdFromEmailMessageId (messageId: string, email: string): MessageID | undefined {
  const domain = getDomainFromEmail(email)

  const cleanMessageId = messageId.replace(/^<|>$/g, '')

  const domainSuffix = `@${domain}`
  if (!cleanMessageId.endsWith(domainSuffix)) {
    return undefined
  }

  return cleanMessageId.substring(0, cleanMessageId.length - domainSuffix.length) as MessageID
}

export function generateNewEmailId (email: string): string {
  return getEmailMessageIdFromHulyId(generateMessageId(), email)
}

export function isHulyEmailMessageId (messageId: string, email: string): boolean {
  return getHulyIdFromEmailMessageId(messageId, email) !== undefined
}
