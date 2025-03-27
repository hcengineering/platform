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

import { encode } from 'jwt-simple'
import { type TxOperations, generateId, RateLimiter, buildSocialIdString, SocialIdType, systemAccountUuid, PersonId } from '@hcengineering/core'
import { type AccountClient, getClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import chunter from '@hcengineering/chunter'
import contact from '@hcengineering/contact'
import mail from '@hcengineering/mail'
import config from './config'

function generateToken (): string {
  return encode(
    {
      account: systemAccountUuid,
      extra: { service: 'mail' }
    },
    config.secret
  )
}

async function getTxClient (accountClient: AccountClient, mail: string): Promise<TxOperations> {
  const socialKey = buildSocialIdString({ type: SocialIdType.EMAIL, value: mail })
  const personUuid = await accountClient.findPersonBySocialKey(socialKey)
  if (personUuid === undefined) {
    throw new Error(`Account not found for ${mail}`)
  }
  const workspaces = await accountClient.getPersonWorkspaces(personUuid)
  const workspace = workspaces.find((w) => w.workspace === config.workspaceUuid)
  if (workspace === undefined) {
    throw new Error(`Account ${mail} is not a member of workspace ${config.workspaceUuid}`)
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
  content: string
): Promise<void> {
  const accountClient = getClient(config.accountsUrl, generateToken())

  const [firstName, lastName] = fromName.split(' ')
  const {
    uuid: fromPersonUuid,
    socialId: fromSocialId
  } = await accountClient.ensurePerson(SocialIdType.EMAIL, fromAddress, firstName, lastName)
  console.log('FROM_PERSON_GLOBAL', fromPersonUuid, fromSocialId)

  // const guestChannel = await client.findOne(contact.class.Channel, {
  //   attachedTo: guestPerson._id,
  //   attachedToClass: contact.class.Person,
  //   provider: contact.channelProvider.Email,
  //   value: req.booking.email
  // })
  // if (guestChannel === undefined) {
  //   await client.addCollection(
  //     contact.class.Channel,
  //     contact.space.Contacts,
  //     guestPerson._id,
  //     contact.class.Person,
  //     'channels',
  //     {
  //       provider: contact.channelProvider.Email,
  //       value: req.booking.email
  //     },
  //     generateId(),
  //     now.getTime(),
  //     hostSocialId._id
  //   )
  // }

  for (const to of tos) {
    try {
      console.log(`Sending message ${fromAddress} --> ${to}`)
      const client = await getTxClient(accountClient, to)
      await createMessage(client, mailId, to, subject, content, fromSocialId)
    } catch (err) {
      console.error(`Failed to send message ${fromAddress} --> ${to}`, err)
    }
  }
}

async function createMessage (
  client: TxOperations,
  mailId: string,
  to: string,
  subject: string,
  content: string,
  from: PersonId
): Promise<void> {
  const socialIds = await client.findAll(contact.class.SocialIdentity, { type: SocialIdType.EMAIL, value: to })
  // console.log('SOCIAL_IDS', socialIds)
  const personRefs = socialIds.map((socialId) => socialId.attachedTo)
  // console.log('PERSON_REFS', personRefs)
  const personSpaces = await client.findAll(contact.class.PersonSpace, { person: { $in: personRefs } })
  if (personSpaces.length === 0) {
    throw new Error('Personal space not found')
  }

  const rateLimiter = new RateLimiter(10)
  for (const space of personSpaces) {
    await rateLimiter.add(async () => {
      console.log('Saving message to space', space._id)

      const mailRoute = await client.findOne(
        mail.class.MailRoute,
        { mailId },
        { projection: { _id: 1 } }
      )
      if (mailRoute !== undefined) {
        console.log('Message is already in the thread, skip', mailRoute._id)
        return
      }

      const threadId = await client.createDoc(
        mail.class.MailThread,
        space._id,
        {
          mailThreadId: mailId,
          title: subject,
          description: content,
          private: true,
          members: [space.members[0]],
          archived: false
        },
        generateId(),
        undefined,
        from
      )

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

// async function getOrCreateMailThread (
//   client: TxOperations,
//   message: MailInfo,
//   personSpace: PersonSpace,
//   personId: AccountUuid
// ): Promise<Ref<Card>> {
//   // const threadId = await findThread(client, message)
//   // if (threadId !== undefined) {
//   //   console.log('Existing mail thread found', threadId)
//   //   return threadId
//   // }

//   console.log('Creating new mail thread')
//   const newRef = await client.createDoc(
//     mail.class.MailThread,
//     personSpace._id,
//     {
//       mailThreadId: message.messageId,
//       title: message.subject ?? '',
//       description: getContent(message),
//       private: true,
//       members: [personId],
//       archived: false
//     },
//     generateId()
//   )
//   return newRef as Ref<Card>
// }

// export async function findThread(client: TxRestClient, message: Email): Promise<Ref<Card> | undefined> {
//   try {
//     const reply = message.inReplyTo
//     if (reply === undefined) {
//       return undefined
//     }
//     const route = await client.findOne(mail.class.MailRoute, { mailId: reply })
//     console.log('Route:', route)
//     return route?.threadId as Ref<Card>
//   } catch (err: any) {
//     console.error('Failed to find thread')
//     throw err
//   }
// }
