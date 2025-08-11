import { CreateMessageEvent } from '@hcengineering/communication-sdk-types'
import { type GaxiosResponse } from 'gaxios'
import { gmail_v1 } from 'googleapis'
import { markdownToHtml, getReplySubject } from '@hcengineering/mail-common'

import { encode64 } from '../../base64'
import { addFooter } from '../../utils'
import { Card } from '@hcengineering/card'
import { PersonId, SocialIdType } from '@hcengineering/core'
import { AccountClient } from '@hcengineering/account-client'
import { HulyMailHeader, HulyMessageIdHeader } from '../../types'

const SENT_HEADER = 'X-Huly-Sent'
const MESSAGE_ID_HEADER = 'X-Huly-Message-Id'

export async function makeHTMLBodyV2 (
  accountClient: AccountClient,
  message: CreateMessageEvent,
  thread: Card,
  personId: PersonId,
  from: string
): Promise<string | undefined> {
  const collaborators: PersonId[] = (thread as any).members ?? []
  if (collaborators.length === 0) {
    return undefined
  }
  const recipients = collaborators.length > 1 ? collaborators.filter((c) => c !== personId) : collaborators
  const mailSocialIds = (await accountClient.findFullSocialIds(recipients)).filter(
    (id) => id.type === SocialIdType.EMAIL
  )
  console.warn('mailSocialIds', mailSocialIds)
  if (mailSocialIds.length === 0) {
    console.warn('No social IDs found for recipients', { recipients })
    return undefined
  }
  const to = mailSocialIds[0].value
  const copy = mailSocialIds.length > 1 ? mailSocialIds.slice(1).map((s) => s.value) : []

  const str = [
    'Content-Type: text/html; charset="UTF-8"\n',
    'MIME-Version: 1.0\n',
    'Content-Transfer-Encoding: 7bit\n',
    `To: ${to} \n`,
    `From: ${from} \n`,
    `${HulyMailHeader}: true\n`,
    `${HulyMessageIdHeader}: ${message._id}\n`
  ]

  // TODO: get reply-to from channel

  if (copy != null && copy.length > 0) {
    str.push(`Cc: ${copy.join(', ')}  \n`)
  }

  const subject = getReplySubject(thread.title)
  console.warn('Creating HTML body for message', { subject })
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
  const platformSentHeader = headers.find((h) => h.name === SENT_HEADER)
  if (platformSentHeader?.value === 'true') {
    return true
  }

  // Check for platform message ID header
  const platformMessageIdHeader = headers.find((h) => h.name === MESSAGE_ID_HEADER)
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
  const platformMessageIdHeader = headers.find((h) => h.name === MESSAGE_ID_HEADER)
  return platformMessageIdHeader?.value ?? undefined
}
