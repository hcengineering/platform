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

import { type SocialKey, type PersonId, type TxOperations, buildSocialIdString, SocialIdType, type Ref } from '@hcengineering/core'
import contact, { type Person, type PersonSpace } from '@hcengineering/contact'
import { MailInfo } from '../types'

export async function getPersonSpaces(client: TxOperations, message: MailInfo): Promise<PersonSpace[]> {
  try {
    const participants = getTargetPersons(message)
    const personRefsByIds = await getPersonRefsBySocialIds(client, participants)
    const personRefs = Object.values(personRefsByIds)
    return await client.findAll(contact.class.PersonSpace, { person: { $in: personRefs } })
  } catch (err) {
    console.error('Failed to get person spaces')
    throw err
  }
}

export function getTargetPersons(message: MailInfo): PersonId[] {
  return message.to?.flatMap((to) => getSocialId(to))
}

export function getSocialId(email: string): PersonId {
  const socialKey: SocialKey = { type: SocialIdType.EMAIL, value: email }
  return buildSocialIdString(socialKey)
}

async function getPersonRefsBySocialIds(
  client: TxOperations,
  ids: PersonId[] = []
): Promise<Record<PersonId, Ref<Person>>> {
  try {
    const socialIds = await client.findAll(contact.class.SocialIdentity, ids.length === 0 ? {} : { key: { $in: ids } })
    const result: Record<PersonId, Ref<Person>> = {}

    for (const socialId of socialIds) {
      result[socialId.key] = socialId.attachedTo
    }

    return result
  } catch (err) {
    console.error('Failed to get person refs', ids)
    throw err
  }
}

/** 
export async function ensurePerson(client: AccountClient, message: MailInfo): Promise<void> {
  try {
    const { firstName, lastName } = splitFullName(message.from?.name, message.from?.address)
    await client.ensurePerson(SocialIdType.EMAIL, message.from?.address, firstName, lastName)
  } catch (err: any) {
    console.error(`Failed to ensure person ${message.from?.address}`, err.message)
  }
}

function splitFullName(fullName: string, address: string): { firstName: string; lastName: string } {
  const [firstName, ...rest] = fullName.split(' ')
  const lastName = rest.join(' ')
  if (firstName === undefined || lastName === undefined) {
    return { firstName: address, lastName: 'Unknown' }
  }
  return { firstName, lastName }
}
*/
