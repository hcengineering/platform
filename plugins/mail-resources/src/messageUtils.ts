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
import {
  type Account,
  type Client,
  type Data,
  type Doc,
  type Ref,
  SocialIdType,
  type Space,
  type TxOperations,
  generateId,
  getCurrentAccount,
  parseSocialIdString
} from '@hcengineering/core'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import contact, { getCurrentEmployee } from '@hcengineering/contact'
import { isSpace } from '@hcengineering/presentation'
import type { MailThread } from '@hcengineering/mail'

import mail from './plugin'

interface MessageData {
  id: Ref<ChatMessage>
  from: string
  to: string
  subject: string
  text: string
}

export async function createMailMessage (
  client: TxOperations & Client,
  mailThreadId: Ref<MailThread> | undefined,
  data: MessageData
): Promise<Ref<ChatMessage>> {
  const mailThread = await getOrCreateMailThread(client, mailThreadId, data)

  if (mailThread === undefined) {
    throw new Error('Failed to create mail thread')
  }

  return await client.addCollection<Doc, ChatMessage>(
    chunter.class.ChatMessage,
    getSpace(mailThread),
    mailThread._id,
    mail.class.MailThread,
    'messages',
    { message: data?.text ?? '' },
    data.id
  )
}

async function getOrCreateMailThread (
  client: TxOperations & Client,
  mailThreadId: Ref<MailThread> | undefined,
  data: MessageData
): Promise<MailThread | undefined> {
  const threadId = mailThreadId ?? (await createMailThread(client, data))

  return await client.findOne(mail.class.MailThread, { _id: threadId })
}

async function createMailThread (client: TxOperations & Client, messageData: MessageData): Promise<Ref<MailThread>> {
  const account = getCurrentAccount()
  const employee = getCurrentEmployee()
  const space = await client.findOne(contact.class.PersonSpace, { person: employee }, { projection: { _id: 1 } })
  if (space === undefined) {
    throw new Error('No space found')
  }

  const data: Data<MailThread> = {
    ...messageData,
    mailThreadId: generateId(),
    name: messageData.subject,
    description: '',
    private: true,
    members: [account.primarySocialId],
    archived: false,
    preview: getMessagePreview(messageData.text)
  }

  return await client.createDoc(mail.class.MailThread, space._id, data)
}

function getMessagePreview (message: string): string {
  return message.length > 300 ? message.substring(0, 300) + '...' : message
}

function getSpace (doc: Doc): Ref<Space> {
  return isSpace(doc) ? doc._id : doc.space
}

export function isValidEmail (email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function getReplySubject (subject: string): string {
  return subject.startsWith('Re:') ? subject : `Re: ${subject}`
}

export function getEmailSocialId (account: Account): string {
  return (
    account.socialIds.map((id) => parseSocialIdString(id)).find((it) => it.type === SocialIdType.EMAIL)?.value ?? ''
  )
}
