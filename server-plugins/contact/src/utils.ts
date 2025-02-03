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
import contact, { Employee, type Person } from '@hcengineering/contact'
import { PersonId, toIdMap, parseSocialIdString, type Ref } from '@hcengineering/core'

export async function getTriggerCurrentPerson (control: TriggerControl): Promise<Person | undefined> {
  const { type, value } = parseSocialIdString(control.txFactory.account)
  const socialIdentity = (await control.findAll(control.ctx, contact.class.SocialIdentity, { type, value }))[0]

  if (socialIdentity === undefined) {
    return undefined
  }

  const person = (await control.findAll(control.ctx, contact.class.Person, { _id: socialIdentity.attachedTo, _class: socialIdentity.attachedToClass }))[0]

  return person
}

export async function getSocialStrings (control: TriggerControl, person: Ref<Person>): Promise<PersonId[]> {
  const socialIdentities = await control.findAll(control.ctx, contact.class.SocialIdentity, { attachedTo: person, attachedToClass: contact.class.Person })

  return socialIdentities.map((s) => s.key)
}

export async function getSocialStringsByPersons (control: TriggerControl, persons: Ref<Person>[]): Promise<Record<Ref<Person>, PersonId[]>> {
  const socialIdentities = await control.findAll(control.ctx, contact.class.SocialIdentity, { attachedTo: { $in: persons }, attachedToClass: contact.class.Person })

  return socialIdentities.reduce<Record<Ref<Person>, PersonId[]>>((acc, s) => {
    if (acc[s.attachedTo] === undefined) {
      acc[s.attachedTo] = []
    }

    acc[s.attachedTo].push(s.key)

    return acc
  }, {})
}

export async function getAllSocialStringsByPersonId (control: TriggerControl, personIds: PersonId[]): Promise<PersonId[]> {
  const socialIdentities = await control.findAll(control.ctx, contact.class.SocialIdentity, { key: { $in: personIds } })
  const allSocialIdentities = await control.findAll(control.ctx, contact.class.SocialIdentity, { attachedTo: { $in: socialIdentities.map((sid) => sid.attachedTo) }, attachedToClass: contact.class.Person })

  return allSocialIdentities.map((sid) => sid.key)
}

export async function getPerson (control: TriggerControl, personId: PersonId): Promise<Person | undefined> {
  const socialId = (await control.findAll(control.ctx, contact.class.SocialIdentity, { key: personId }))[0]
  const person = (await control.findAll(control.ctx, contact.class.Person, { _id: socialId.attachedTo }))[0]

  return person
}

export async function getPersons (control: TriggerControl, personIds: PersonId[]): Promise<Person[]> {
  const socialIds = await control.findAll(control.ctx, contact.class.SocialIdentity, { key: { $in: personIds } })
  const persons = await control.findAll(control.ctx, contact.class.Person, { _id: { $in: socialIds.map((s) => s.attachedTo) } })

  return persons
}

export async function getPersonsBySocialIds (control: TriggerControl, personIds: PersonId[]): Promise<Record<string, Person>> {
  const socialIds = await control.findAll(control.ctx, contact.class.SocialIdentity, { key: { $in: personIds } })
  const persons = toIdMap(await control.findAll(control.ctx, contact.class.Person, { _id: { $in: socialIds.map((s) => s.attachedTo) } }))

  return socialIds.reduce<Record<string, Person>>((acc, s) => {
    const person = persons.get(s.attachedTo)
    if (person !== undefined) {
      acc[s.key] = person
    } else {
      console.error('No person found for social id', s.key)
    }

    return acc
  }, {})
}

export async function getEmployee (control: TriggerControl, personId: PersonId): Promise<Employee | undefined> {
  const socialId = (await control.findAll(control.ctx, contact.class.SocialIdentity, { key: personId }))[0]
  const employee = (await control.findAll(control.ctx, contact.mixin.Employee, { _id: socialId.attachedTo as Ref<Employee> }))[0]

  return employee
}

export async function getEmployees (control: TriggerControl, personIds: PersonId[]): Promise<Employee[]> {
  const socialIds = await control.findAll(control.ctx, contact.class.SocialIdentity, { key: { $in: personIds } })
  const employees = await control.findAll(control.ctx, contact.mixin.Employee, { _id: { $in: socialIds.map((s) => s.attachedTo as Ref<Employee>) } })

  return employees
}

export async function getEmployeesBySocialIds (control: TriggerControl, personIds: PersonId[]): Promise<Record<string, Employee | undefined>> {
  const socialIds = await control.findAll(control.ctx, contact.class.SocialIdentity, { key: { $in: personIds } })
  const employees = toIdMap(await control.findAll(control.ctx, contact.mixin.Employee, { _id: { $in: socialIds.map((s) => s.attachedTo as Ref<Employee>) } }))

  return socialIds.reduce<Record<string, Employee | undefined>>((acc, s) => {
    acc[s.key] = employees.get(s.attachedTo as Ref<Employee>)

    return acc
  }, {})
}
