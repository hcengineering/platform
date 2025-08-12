import { CreateMessageEvent } from '@hcengineering/communication-sdk-types'
import { type GaxiosResponse } from 'gaxios'
import { gmail_v1 } from 'googleapis'
import {
  markdownToHtml,
  getReplySubject,
  getRecipients,
  getMailHeaders,
  HulyMailHeader,
  HulyMessageIdHeader
} from '@hcengineering/mail-common'
import { Card } from '@hcengineering/card'
import { MeasureContext, PersonId } from '@hcengineering/core'
import { AccountClient } from '@hcengineering/account-client'

import { encode64 } from '../../base64'
import { addFooter } from '../../utils'
import { GmailMessageType } from '../../types'

export async function makeHTMLBodyV2 (
  ctx: MeasureContext,
  accountClient: AccountClient,
  message: CreateMessageEvent,
  thread: Card,
  personId: PersonId,
  from: string
): Promise<string | undefined> {
  const recipients = await getRecipients(ctx, accountClient, thread, personId)
  if (recipients === undefined) {
    return undefined
  }
  const { to, copy } = recipients
  const str = [
    'Content-Type: text/html; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    'Content-Transfer-Encoding: 7bit\n',
    `To: ${to} \n`,
    `From: ${from} \n`,
    ...getMailHeaders(GmailMessageType, message._id)
  ]

  // TODO: get reply-to from channel

  if (copy != null && copy.length > 0) {
    str.push(`Cc: ${copy.join(', ')}  \n`)
  }

  const subject = getReplySubject(thread.title)
  if (subject != null) {
    str.push(`Subject: =?UTF-8?B?${encode64(subject)}?= \n`)
  }

  str.push('\n\n')
  str.push(addFooter(markdownToHtml(message.content)))
  const res = str.join('')
  return encode64(res).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Check if a Gmail message was sent by the platform
 */
export function isPlatformSentMessage (message: gmail_v1.Schema$Message): boolean {
  if (message.payload?.headers == null) return false

  // Check for custom platform headers
  const headers = message.payload.headers
  const platformSentHeader = headers.find((h) => h.name === HulyMailHeader)
  if (platformSentHeader?.value === 'true') {
    return true
  }

  // Check for platform message ID header
  const platformMessageIdHeader = headers.find((h) => h.name === HulyMessageIdHeader)
  if (platformMessageIdHeader?.value != null) {
    return true
  }

  return false
}

/**
 * Check if message has platform footer signature
 */
export function hasPlatformFooter (messageBody: string): boolean {
  const platformFooterPattern = /Sent via Huly/i
  return platformFooterPattern.test(messageBody)
}

/**
 * Extract platform message ID from headers if available
 */
export function getPlatformMessageId (message: GaxiosResponse<gmail_v1.Schema$Message>): string | undefined {
  const headers = message.data?.payload?.headers
  if (headers == null) return undefined
  const platformMessageIdHeader = headers.find((h) => h.name === HulyMessageIdHeader)
  return platformMessageIdHeader?.value ?? undefined
}
