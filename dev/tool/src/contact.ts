//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { AccountClient } from '@hcengineering/account-client'
import contact, { type SocialIdentityRef } from '@hcengineering/contact'
import {
  buildSocialIdString,
  type MeasureMetricsContext,
  type PersonInfo,
  type TxOperations
} from '@hcengineering/core'

export interface EnsureMissingSocialIdentitiesResult {
  skippedPersons: number
  wouldCreate: number
  created: number
}

/**
 * For each workspace person linked to an account, ensures SocialIdentity docs exist
 * for every active account social id (same _id as in the account DB). See
 * {@link createSocialIdentities} in model-contact migration.
 */
export async function ensureMissingSocialIdentities (
  toolCtx: MeasureMetricsContext,
  ops: TxOperations,
  accountClient: Pick<AccountClient, 'getPersonInfo'>,
  dryRun: boolean
): Promise<EnsureMissingSocialIdentitiesResult> {
  let wouldCreate = 0
  let created = 0
  let skippedPersons = 0

  const persons = await ops.findAll(contact.class.Person, {})
  for (const person of persons) {
    const employee = ops.getHierarchy().as(person, contact.mixin.Employee)
    const personUuid = employee?.personUuid ?? person.personUuid
    if (personUuid == null) {
      skippedPersons++
      continue
    }
    let personInfo: PersonInfo
    try {
      personInfo = await accountClient.getPersonInfo(personUuid)
    } catch (err: any) {
      toolCtx.error('ensure-missing-social-identities: getPersonInfo failed', {
        person: person._id,
        personUuid,
        message: err?.message ?? String(err)
      })
      continue
    }
    const socials = (personInfo.socialIds ?? []).filter((s) => s.isDeleted !== true)
    for (const social of socials) {
      const socialDocId = social._id as SocialIdentityRef
      const expectedKey = buildSocialIdString({ type: social.type, value: social.value })
      if (social.key !== expectedKey) {
        toolCtx.warn('ensure-missing-social-identities: social key does not match type:value', {
          person: person._id,
          personUuid,
          socialId: social._id,
          key: social.key,
          expectedKey
        })
      }
      const existingById = await ops.findOne(contact.class.SocialIdentity, { _id: socialDocId })
      if (existingById != null) {
        continue
      }
      const existingByKey = await ops.findOne(contact.class.SocialIdentity, {
        attachedTo: person._id,
        key: social.key
      })
      if (existingByKey != null) {
        toolCtx.warn('ensure-missing-social-identities: SocialIdentity exists for key but different _id', {
          person: person._id,
          personUuid,
          accountSocialId: social._id,
          existingId: existingByKey._id,
          key: social.key
        })
        continue
      }
      if (dryRun) {
        wouldCreate++
        console.log(
          '[dry-run] missing SocialIdentity',
          JSON.stringify({
            person: person._id,
            personUuid,
            socialId: social._id,
            key: social.key,
            type: social.type
          })
        )
      } else {
        await ops.addCollection(
          contact.class.SocialIdentity,
          contact.space.Contacts,
          person._id,
          contact.class.Person,
          'socialIds',
          {
            type: social.type,
            value: social.value,
            key: social.key,
            isDeleted: false,
            ...(social.verifiedOn != null ? { verifiedOn: social.verifiedOn } : {}),
            ...(social.displayValue != null ? { displayValue: social.displayValue } : {})
          },
          socialDocId
        )
        created++
      }
    }
  }

  return { skippedPersons, wouldCreate, created }
}
