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
import {
  type MeasureContext,
  buildSocialIdString,
  generateId,
  PersonId,
  PersonUuid,
  SocialIdType,
  TxOperations
} from '@hcengineering/core'
import contact, { AvatarType, combineName, SocialIdentityRef } from '@hcengineering/contact'
import { AccountClient } from '@hcengineering/account-client'

import { GooglePeopleClient } from '../gmail/peopleClient'

export async function ensureGlobalPerson (
  ctx: MeasureContext,
  client: AccountClient,
  mailId: string,
  email: string,
  peopleClient: GooglePeopleClient
): Promise<{ socialId: PersonId, uuid: PersonUuid, firstName: string, lastName: string } | undefined> {
  const googlePerson = await peopleClient.getContactInfo(email)
  const firstName = googlePerson?.firstName ?? email
  const lastName = googlePerson?.lastName ?? ''
  const socialKey = buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
  const socialId = await client.findSocialIdBySocialKey(socialKey)
  const uuid = await client.findPersonBySocialKey(socialKey)
  if (socialId !== undefined && uuid !== undefined) {
    return { socialId, uuid, firstName, lastName }
  }
  try {
    const globalPerson = await client.ensurePerson(SocialIdType.EMAIL, email, firstName, lastName)
    ctx.info('Created global person', { mailId, email, personUuid: globalPerson.uuid })
    return { ...globalPerson, firstName, lastName }
  } catch (error) {
    ctx.error('Failed to create global person', { mailId, error, email })
  }
  return undefined
}

export async function ensureLocalPerson (
  ctx: MeasureContext,
  client: TxOperations,
  mailId: string,
  personUuid: PersonUuid,
  personId: PersonId,
  email: string,
  firstName: string,
  lastName: string
): Promise<void> {
  let person = await client.findOne(contact.class.Person, { personUuid })
  if (person === undefined) {
    const newPersonId = await client.createDoc(
      contact.class.Person,
      contact.space.Contacts,
      {
        avatarType: AvatarType.COLOR,
        name: combineName(firstName, lastName),
        personUuid
      },
      generateId()
    )
    person = await client.findOne(contact.class.Person, { _id: newPersonId })
    if (person === undefined) {
      throw new Error(`Failed to create local person for ${personUuid}`)
    } else {
      ctx.info('Created local person', { mailId, personUuid, _id: person._id })
    }
  }
  const socialId = await client.findOne(contact.class.SocialIdentity, {
    attachedTo: person._id,
    type: SocialIdType.EMAIL,
    value: email
  })
  if (socialId === undefined) {
    await client.addCollection(
      contact.class.SocialIdentity,
      contact.space.Contacts,
      person._id,
      contact.class.Person,
      'socialIds',
      {
        key: buildSocialIdString({ type: SocialIdType.EMAIL, value: email }),
        type: SocialIdType.EMAIL,
        value: email
      },
      personId as SocialIdentityRef
    )
    ctx.info('Created local socialId', { mailId, personUuid, email })
  }
  const channel = await client.findOne(contact.class.Channel, {
    attachedTo: person._id,
    attachedToClass: contact.class.Person,
    provider: contact.channelProvider.Email,
    value: email
  })
  if (channel === undefined) {
    await client.addCollection(
      contact.class.Channel,
      contact.space.Contacts,
      person._id,
      contact.class.Person,
      'channels',
      {
        provider: contact.channelProvider.Email,
        value: email
      },
      generateId()
    )
    ctx.info('Created channel', { mailId, personUuid, email })
  }
}
