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

import { type Ref, generateId, RateLimiter, type AccountUuid } from '@hcengineering/core'
import type { Email } from 'postal-mime'
import { htmlToMarkdown } from '@hcengineering/html-to-md'
import mail from '@hcengineering/mail'
import { type Card } from '@hcengineering/card'
import chunter, { type ChatMessage } from '@hcengineering/chunter'

import { getPersonSpaces, getSocialId } from './persons'

import type { PersonSpace } from '@hcengineering/contact'
import type { TxRestClient } from '@hcengineering/cloud-transactor-client'
import { Config } from '../config'

export async function createMessage(config: Config, client: TxRestClient, message: Email): Promise<void> {
  const workspaceId = config.workspaceId
  if (workspaceId === null) {
    throw new Error('Workspace ID is not defined in environment')
  }
  const personSpaces = await getPersonSpaces(client, message, env.DOMAIN)

  if (personSpaces === undefined || personSpaces.length === 0) {
    throw new Error('No personal space found')
  }
  const rateLimiter = new RateLimiter(10)
  for (const space of personSpaces) {
    await rateLimiter.add(async () => {
      const person = space.members[0]
      if (message.messageId !== undefined && message.messageId.trim().length > 0) {
        const mailMessage = await client.findOne(
          mail.class.MailRoute,
          { mailId: message.messageId },
          { projection: { _id: 1 } }
        )
        if (mailMessage?._id !== undefined) {
          console.log('Skip message', mailMessage?._id)
          return
        }
      }

      const threadId = await getOrCreateMailThread(client, message, space, person)

      if (threadId === undefined) {
        console.warn('Thread not found')
        return
      }
      await createMailMessage(client, space, threadId, message)
      await addMailRoute(client, message, threadId, space, person)
      console.log('Message created in space: ', space._id)
    })
  }
  await rateLimiter.waitProcessing()
}

export function getContent(message: Email): string {
  const markdown = htmlToMarkdown(message.html)
  return markdown ?? message.text ?? ''
}

async function getOrCreateMailThread(
  client: TxRestClient,
  message: Email,
  personSpace: PersonSpace,
  personId: AccountUuid
): Promise<Ref<Card>> {
  const threadId = await findThread(client, message)
  if (threadId !== undefined) {
    console.log('Existing mail thread found', threadId)
    return threadId
  }
  console.log('Creating new mail thread')
  return await createMailThread(client, message, personSpace, personId)
}

async function createMailThread(
  client: TxRestClient,
  message: Email,
  personSpace: PersonSpace,
  personId: AccountUuid
): Promise<Ref<Card>> {
  try {
    const from = getSocialId(message.from?.address)
    const subject = message.subject ?? ''
    const threadId = generateId()
    await client.createDoc(
      mail.class.MailThread,
      personSpace._id,
      {
        mailThreadId: message.messageId,
        title: subject,
        description: getContent(message),
        private: true,
        members: [personId],
        archived: false,
        modifiedBy: from
      },
      threadId,
      undefined,
      from
    )
    return threadId as Ref<Card>
  } catch (err: any) {
    console.error('Failed to create mail thread')
    throw err
  }
}

async function createMailMessage(
  client: TxRestClient,
  personSpace: PersonSpace,
  mailThread: Ref<Card>,
  message: Email
): Promise<Ref<ChatMessage>> {
  try {
    const from = getSocialId(message.from?.address)
    const messageId: Ref<ChatMessage> = generateId()
    return await client.addCollection(
      chunter.class.ChatMessage,
      personSpace._id,
      mailThread,
      mail.class.MailThread,
      'messages',
      { message: getContent(message) },
      messageId,
      undefined,
      from
    )
  } catch (err: any) {
    console.error('Failed to create mail message')
    throw err
  }
}

export async function findThread(client: TxRestClient, message: Email): Promise<Ref<Card> | undefined> {
  try {
    const reply = message.inReplyTo
    if (reply === undefined) {
      return undefined
    }
    const route = await client.findOne(mail.class.MailRoute, { mailId: reply })
    console.log('Route:', route)
    return route?.threadId as Ref<Card>
  } catch (err: any) {
    console.error('Failed to find thread')
    throw err
  }
}

export async function addMailRoute(
  client: TxRestClient,
  message: Email,
  threadId: Ref<Card>,
  personSpace: PersonSpace,
  person: AccountUuid
): Promise<void> {
  try {
    await client.createDoc(
      mail.class.MailRoute,
      personSpace._id,
      {
        mailId: message.messageId,
        threadId
      },
      generateId(),
      undefined,
      person as any
    )
  } catch (err: any) {
    console.warn('Failed to add mail route', err.message)
  }
}
