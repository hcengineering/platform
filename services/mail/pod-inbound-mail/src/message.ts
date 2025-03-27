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
import { encode } from 'jwt-simple'
import {
  type PersonId,
  type Ref,
  type TxOperations,
  generateId,
  RateLimiter,
  buildSocialIdString,
  SocialIdType,
  systemAccountUuid
} from '@hcengineering/core'
import { type AccountClient, getClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import { type Card } from '@hcengineering/card'
import chunter from '@hcengineering/chunter'
import contact from '@hcengineering/contact'
import mail from '@hcengineering/mail'
import config from './config'
import { ensureLocalPerson } from './person'

function generateToken (): string {
  return encode(
    {
      account: systemAccountUuid,
      extra: { service: 'mail' }
    },
    config.secret
  )
}

async function getTxClient (accountClient: AccountClient, email: string): Promise<TxOperations> {
  const socialKey = buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
  const personUuid = await accountClient.findPersonBySocialKey(socialKey)
  if (personUuid === undefined) {
    throw new Error(`Account not found for ${email}`)
  }
  const workspaces = await accountClient.getPersonWorkspaces(personUuid)
  const workspace = workspaces.find((w) => w.workspace === config.workspaceUuid)
  if (workspace === undefined) {
    throw new Error(`Account ${email} is not a member of workspace ${config.workspaceUuid}`)
  }
  const wsInfo = await accountClient.selectWorkspace(workspace.workspaceUrl)
  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  console.log('Transactor URL:', transactorUrl)
  return await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)
}

export async function createMessages (
  mailId: string,
  fromAddress: string,
  fromName: string,
  tos: string[],
  subject: string,
  content: string,
  inReplyTo?: string
): Promise<void> {
  const accountClient = getClient(config.accountsUrl, generateToken())

  const [firstName, lastName] = fromName.split(' ')
  const {
    uuid: fromPersonUuid,
    socialId: fromSocialId
  } = await accountClient.ensurePerson(SocialIdType.EMAIL, fromAddress, firstName, lastName)
  for (const to of tos) {
    try {
      console.log(`Sending message ${fromAddress} --> ${to}`)
      const client = await getTxClient(accountClient, to)
      await ensureLocalPerson(client, fromPersonUuid, fromSocialId, fromAddress, firstName, lastName)
      await createMessage(client, mailId, fromSocialId, to, subject, content, inReplyTo)
    } catch (err) {
      console.error(`Failed to send message ${fromAddress} --> ${to}`, err)
    }
  }
}

async function createMessage (
  client: TxOperations,
  mailId: string,
  from: PersonId,
  to: string,
  subject: string,
  content: string,
  inReplyTo?: string
): Promise<void> {
  const socialIds = await client.findAll(contact.class.SocialIdentity, { type: SocialIdType.EMAIL, value: to })
  const personRefs = socialIds.map((socialId) => socialId.attachedTo)
  const personSpaces = await client.findAll(contact.class.PersonSpace, { person: { $in: personRefs } })
  if (personSpaces.length === 0) {
    throw new Error('Personal space not found')
  }

  const rateLimiter = new RateLimiter(10)
  for (const space of personSpaces) {
    await rateLimiter.add(async () => {
      console.log('Saving message to space', space._id)

      const route = await client.findOne(mail.class.MailRoute, { mailId })
      if (route !== undefined) {
        console.log('Message is already in the thread, skip', route._id)
        return
      }

      let threadId: Ref<Card> | undefined
      if (inReplyTo !== undefined) {
        const route = await client.findOne(mail.class.MailRoute, { mailId: inReplyTo })
        if (route !== undefined) {
          threadId = route.threadId as Ref<Card>
          console.log('Found existing mail thread', threadId)
        }
      }
      if (threadId === undefined) {
        const newThreadId = await client.createDoc(
          mail.class.MailThread,
          space._id,
          {
            title: subject,
            description: content,
            private: true,
            members: [from, ...socialIds.map((si) => si._id)],
            archived: false,
            createdBy: from,
            modifiedBy: from
          },
          generateId(),
          undefined,
          from
        )
        threadId = newThreadId as Ref<Card>
        console.log('Created new mail thread', threadId)
      }

      await client.addCollection(
        chunter.class.ChatMessage,
        space._id,
        threadId,
        mail.class.MailThread,
        'messages',
        { message: content },
        generateId(),
        undefined,
        from
      )

      await client.createDoc(
        mail.class.MailRoute,
        space._id,
        {
          mailId,
          threadId
        },
        generateId(),
        undefined,
        from
      )
    })
  }
  await rateLimiter.waitProcessing()
}
