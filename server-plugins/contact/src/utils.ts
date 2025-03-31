//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { TriggerControl } from '@hcengineering/server-core'
import contact, { Employee, type Person, pickPrimarySocialId, SocialIdentityRef } from '@hcengineering/contact'
import { AccountUuid, parseSocialIdString, PersonId, type Ref, toIdMap } from '@hcengineering/core'

export async function getCurrentPerson (control: TriggerControl): Promise<Person | undefined> {
  const { type, value } = parseSocialIdString(control.txFactory.account)
  const socialIdentity = (await control.findAll(control.ctx, contact.class.SocialIdentity, { type, value }))[0]

  if (socialIdentity === undefined) {
    return undefined
  }

  return (
    await control.findAll(control.ctx, contact.class.Person, {
      _id: socialIdentity.attachedTo,
      _class: socialIdentity.attachedToClass
    })
  )[0]
}

export async function getSocialStrings (control: TriggerControl, person: Ref<Person>): Promise<PersonId[]> {
  const socialIdentities = await control.findAll(control.ctx, contact.class.SocialIdentity, {
    attachedTo: person,
    attachedToClass: contact.class.Person
  })

  return socialIdentities.map((s) => s._id)
}

export async function getSocialStringsByPersons (
  control: TriggerControl,
  persons: Ref<Person>[]
): Promise<Record<Ref<Person>, PersonId[]>> {
  const socialIdentities = await control.findAll(control.ctx, contact.class.SocialIdentity, {
    attachedTo: { $in: persons },
    attachedToClass: contact.class.Person
  })

  return socialIdentities.reduce<Record<Ref<Person>, PersonId[]>>((acc, s) => {
    if (acc[s.attachedTo] === undefined) {
      acc[s.attachedTo] = []
    }

    acc[s.attachedTo].push(s._id)

    return acc
  }, {})
}

export async function getAllSocialStringsByPersonId (
  control: TriggerControl,
  personIds: PersonId[]
): Promise<PersonId[]> {
  const socialIdentities = await control.findAll(control.ctx, contact.class.SocialIdentity, {
    _id: { $in: personIds as SocialIdentityRef[] }
  })
  const allSocialIdentities = await control.findAll(control.ctx, contact.class.SocialIdentity, {
    attachedTo: { $in: socialIdentities.map((sid) => sid.attachedTo) },
    attachedToClass: contact.class.Person
  })

  return allSocialIdentities.map((sid) => sid._id)
}

export async function getPerson (control: TriggerControl, personId: PersonId): Promise<Person | undefined> {
  const { contextData } = control.ctx
  const account: AccountUuid | undefined = contextData.account.socialIds.includes(personId)
    ? contextData.account.uuid
    : contextData.socialStringsToUsers.get(personId)

  if (account !== undefined) {
    return (await control.findAll(control.ctx, contact.class.Person, { personUuid: account }))[0]
  }

  const socialId = (
    await control.findAll(control.ctx, contact.class.SocialIdentity, { _id: personId as SocialIdentityRef })
  )[0]

  if (socialId === undefined) {
    control.ctx.error('Cannot find social id', { _id: personId })
    return undefined
  }

  return (await control.findAll(control.ctx, contact.class.Person, { _id: socialId.attachedTo }))[0]
}

export async function getPersonsBySocialIds (
  control: TriggerControl,
  personIds: PersonId[]
): Promise<Record<PersonId, Person>> {
  const socialIds = await control.findAll(control.ctx, contact.class.SocialIdentity, {
    _id: { $in: personIds as SocialIdentityRef[] }
  })
  const persons = toIdMap(
    await control.findAll(control.ctx, contact.class.Person, { _id: { $in: socialIds.map((s) => s.attachedTo) } })
  )

  return socialIds.reduce<Record<PersonId, Person>>((acc, s) => {
    const person = persons.get(s.attachedTo)
    if (person !== undefined) {
      acc[s._id] = person
    } else {
      console.error('No person found for social id', s.key)
    }

    return acc
  }, {})
}

export async function getEmployee (control: TriggerControl, personId: PersonId): Promise<Employee | undefined> {
  const socialId = (
    await control.findAll(control.ctx, contact.class.SocialIdentity, { _id: personId as SocialIdentityRef })
  )[0]

  if (socialId === undefined) {
    control.ctx.error('Cannot find social id', { _id: personId })
    return undefined
  }

  return (
    await control.findAll(
      control.ctx,
      contact.mixin.Employee,
      { _id: socialId.attachedTo as Ref<Employee> },
      { limit: 1 }
    )
  )[0]
}

export async function getEmployeeByAcc (control: TriggerControl, account: AccountUuid): Promise<Employee | undefined> {
  return (await control.findAll(control.ctx, contact.mixin.Employee, { personUuid: account }, { limit: 1 }))[0]
}

export async function getEmployees (control: TriggerControl, accounts: AccountUuid[]): Promise<Employee[]> {
  return await control.findAll(control.ctx, contact.mixin.Employee, {
    personUuid: { $in: accounts }
  })
}

export async function getEmployeesBySocialIds (
  control: TriggerControl,
  personIds: PersonId[]
): Promise<Record<PersonId, Employee | undefined>> {
  const socialIds = await control.findAll(control.ctx, contact.class.SocialIdentity, {
    _id: { $in: personIds as SocialIdentityRef[] }
  })
  const employees = toIdMap(
    await control.findAll(control.ctx, contact.mixin.Employee, {
      _id: { $in: socialIds.map((s) => s.attachedTo as Ref<Employee>) }
    })
  )

  return socialIds.reduce<Record<PersonId, Employee | undefined>>((acc, s) => {
    acc[s._id] = employees.get(s.attachedTo as Ref<Employee>)

    return acc
  }, {})
}

export async function getSocialIdsByAccounts (
  control: TriggerControl,
  accounts: AccountUuid[]
): Promise<Record<AccountUuid, PersonId[]>> {
  const employeesMap = toIdMap(
    await control.findAll(control.ctx, contact.mixin.Employee, { personUuid: { $in: accounts } })
  )
  const socialIds = await control.findAll(control.ctx, contact.class.SocialIdentity, {
    attachedTo: { $in: Array.from(employeesMap.keys()) },
    attachedToClass: contact.class.Person
  })

  return socialIds.reduce<Record<AccountUuid, PersonId[]>>((acc, sid) => {
    const employee = employeesMap.get(sid.attachedTo as Ref<Employee>)
    if (employee?.personUuid === undefined) return acc

    if (acc[employee.personUuid] === undefined) {
      acc[employee.personUuid] = []
    }

    acc[employee.personUuid].push(sid._id)
    return acc
  }, {})
}

export async function getPrimarySocialIdsByAccounts (
  control: TriggerControl,
  accounts: AccountUuid[]
): Promise<Record<AccountUuid, PersonId>> {
  return Object.entries(await getSocialIdsByAccounts(control, accounts)).reduce<Record<AccountUuid, PersonId>>(
    (acc, [account, sids]) => {
      acc[account as AccountUuid] = pickPrimarySocialId(sids)
      return acc
    },
    {}
  )
}

export async function getAccountBySocialId (control: TriggerControl, socialId: PersonId): Promise<AccountUuid | null> {
  const contextAccount = control.ctx.contextData.socialStringsToUsers.get(socialId)
  if (contextAccount != null) {
    return contextAccount
  }

  const controlAccount = control.ctx.contextData.account
  if (controlAccount.socialIds.includes(socialId)) {
    return controlAccount.uuid
  }

  const socialIdentity = await control.findAll(
    control.ctx,
    contact.class.SocialIdentity,
    { _id: socialId as SocialIdentityRef },
    { limit: 1 }
  )

  if (socialIdentity.length === 0) {
    return null
  }

  const employee = await control.findAll(
    control.ctx,
    contact.mixin.Employee,
    { _id: socialIdentity[0].attachedTo as Ref<Employee> },
    { limit: 1 }
  )

  return employee[0]?.personUuid ?? null
}

/**
 * It should only be used for well-known social identities. Should never be used for regular users as social key might change.
 * @param control
 * @param socialId
 */
export async function getAccountBySocialKey (control: TriggerControl, socialKey: string): Promise<AccountUuid | null> {
  const socialIdentity = await control.findAll(
    control.ctx,
    contact.class.SocialIdentity,
    { key: socialKey },
    { limit: 1 }
  )

  if (socialIdentity.length === 0) {
    return null
  }

  const employee = await control.findAll(
    control.ctx,
    contact.mixin.Employee,
    { _id: socialIdentity[0].attachedTo as Ref<Employee> },
    { limit: 1 }
  )

  return employee[0]?.personUuid ?? null
}
