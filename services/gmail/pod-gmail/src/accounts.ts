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
import { AccountUuid, Person, PersonId, SocialId, SocialIdType, buildSocialIdString } from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'
import { IntegrationError } from '@hcengineering/setting'

import { serviceToken } from './utils'

export async function getAccountPerson (account: AccountUuid): Promise<Person | undefined> {
  try {
    const accountClient = getAccountClient(generateToken(account, undefined, { service: 'gmail' }))
    return await accountClient.getPerson()
  } catch (e) {
    console.error(e)
  }
  return undefined
}

export async function getAccountSocialIds (account: AccountUuid): Promise<SocialId[]> {
  try {
    const accountClient = getAccountClient(generateToken(account, undefined, { service: 'gmail' }))
    // We only want not-deleted social ids here?
    return await accountClient.getSocialIds()
  } catch (e) {
    console.error(e)
  }
  return []
}

export async function getOrCreateSocialIdByEmail (
  token: string,
  account: AccountUuid,
  email: string
): Promise<PersonId> {
  const client = getAccountClient(token)
  const socialId = await client.findFullSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
  )
  if (socialId != null) return socialId._id
  return await client.addSocialIdToPerson(account, SocialIdType.EMAIL, email, true)
}

export async function getOrCreateSocialId (account: AccountUuid, email: string): Promise<SocialId> {
  const accountClient = getAccountClient(serviceToken())
  let socialId = await accountClient.findFullSocialIdBySocialKey(
    buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
  )
  if (socialId == null) {
    await accountClient.addSocialIdToPerson(account, SocialIdType.EMAIL, email, true)
    socialId = await accountClient.findFullSocialIdBySocialKey(
      buildSocialIdString({ type: SocialIdType.EMAIL, value: email })
    )
    if (socialId == null) {
      throw new Error('Cannot create social id')
    }
  }

  if (socialId.personUuid !== account) {
    throw new Error(IntegrationError.EMAIL_IS_ALREADY_USED)
  }

  return socialId
}
