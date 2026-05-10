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

import contact, { type Person } from '@hcengineering/contact'
import {
  type Doc,
  MeasureMetricsContext,
  SocialIdType,
  type Space,
  type PersonId,
  type PersonInfo,
  type PersonUuid,
  type Ref,
  type TxOperations
} from '@hcengineering/core'
import { ensureMissingSocialIdentities } from './contact'

function personFixture (overrides: Partial<Person> = {}): Person {
  return {
    _id: 'contact:person:p1' as Ref<Person>,
    _class: contact.class.Person,
    space: contact.space.Contacts,
    name: 'Person One',
    modifiedOn: 0,
    modifiedBy: 'core:account:System' as PersonId,
    personUuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' as PersonUuid,
    ...overrides
  } as any
}

function createMockOps (config: {
  persons: Person[]
  findOne?: jest.Mock
  addCollection?: jest.Mock
  employeePersonUuid?: PersonUuid
}): { ops: TxOperations, addCollection: jest.Mock, findOne: jest.Mock } {
  const findOne =
    config.findOne ??
    jest.fn(async () => {
      return null
    })
  const addCollection = config.addCollection ?? jest.fn(async () => 'new-id' as Ref<Person>)
  const hierarchy = {
    as: (_person: Person, mixin: Ref<Doc<Space>>) => {
      if (mixin === contact.mixin.Employee) {
        return config.employeePersonUuid != null ? { personUuid: config.employeePersonUuid } : {}
      }
      return undefined
    }
  }
  const ops = {
    findAll: jest.fn(async () => config.persons),
    getHierarchy: () => hierarchy,
    findOne,
    addCollection
  } as unknown as TxOperations
  return { ops, addCollection, findOne }
}

describe('ensureMissingSocialIdentities', () => {
  const toolCtx = new MeasureMetricsContext('test', {})

  it('counts persons without personUuid as skipped', async () => {
    const person = personFixture({ personUuid: undefined })
    const { ops } = createMockOps({ persons: [person] })
    const accountClient = { getPersonInfo: jest.fn() }

    const result = await ensureMissingSocialIdentities(toolCtx, ops, accountClient, false)

    expect(result.skippedPersons).toBe(1)
    expect(result.created).toBe(0)
    expect(accountClient.getPersonInfo).not.toHaveBeenCalled()
  })

  it('dry-run does not call addCollection and counts wouldCreate', async () => {
    const person = personFixture()
    const { ops, addCollection } = createMockOps({ persons: [person] })
    const socialId = 'social-id-1' as PersonId
    const accountClient = {
      getPersonInfo: jest.fn(
        async (): Promise<PersonInfo> => ({
          name: 'n',
          socialIds: [
            {
              _id: socialId,
              type: SocialIdType.EMAIL,
              value: 'u@v.com',
              key: 'email:u@v.com'
            }
          ]
        })
      )
    }
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    const result = await ensureMissingSocialIdentities(toolCtx, ops, accountClient, true)

    expect(result.wouldCreate).toBe(1)
    expect(result.created).toBe(0)
    expect(addCollection).not.toHaveBeenCalled()
    expect(logSpy).toHaveBeenCalledWith('[dry-run] missing SocialIdentity', expect.stringContaining('social-id-1'))
    logSpy.mockRestore()
  })

  it('creates SocialIdentity with isDeleted false when not dry-run', async () => {
    const person = personFixture()
    const { ops, addCollection } = createMockOps({ persons: [person] })
    const socialId = 'social-id-2' as PersonId
    const accountClient = {
      getPersonInfo: jest.fn(
        async (): Promise<PersonInfo> => ({
          name: 'n',
          socialIds: [
            {
              _id: socialId,
              type: SocialIdType.EMAIL,
              value: 'a@b.com',
              key: 'email:a@b.com',
              verifiedOn: 1
            }
          ]
        })
      )
    }

    const result = await ensureMissingSocialIdentities(toolCtx, ops, accountClient, false)

    expect(result.created).toBe(1)
    expect(addCollection).toHaveBeenCalledTimes(1)
    expect(addCollection).toHaveBeenCalledWith(
      contact.class.SocialIdentity,
      contact.space.Contacts,
      person._id,
      contact.class.Person,
      'socialIds',
      expect.objectContaining({
        type: SocialIdType.EMAIL,
        value: 'a@b.com',
        key: 'email:a@b.com',
        isDeleted: false,
        verifiedOn: 1
      }),
      socialId
    )
  })

  it('skips creation when SocialIdentity already exists by _id', async () => {
    const person = personFixture()
    const socialId = 'social-id-3' as PersonId
    const findOne = jest.fn(async (_cls: unknown, query: { _id?: PersonId }) => {
      if (query._id === socialId) {
        return { _id: socialId }
      }
      return null
    })
    const { ops, addCollection } = createMockOps({ persons: [person], findOne })
    const accountClient = {
      getPersonInfo: jest.fn(
        async (): Promise<PersonInfo> => ({
          name: 'n',
          socialIds: [
            {
              _id: socialId,
              type: SocialIdType.EMAIL,
              value: 'x@y.com',
              key: 'email:x@y.com'
            }
          ]
        })
      )
    }

    const result = await ensureMissingSocialIdentities(toolCtx, ops, accountClient, false)

    expect(result.created).toBe(0)
    expect(addCollection).not.toHaveBeenCalled()
  })

  it('uses employee.personUuid when present', async () => {
    const empUuid = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' as PersonUuid
    const person = personFixture({ personUuid: undefined })
    const { ops } = createMockOps({ persons: [person], employeePersonUuid: empUuid })
    const accountClient = {
      getPersonInfo: jest.fn(
        async (): Promise<PersonInfo> => ({
          name: 'n',
          socialIds: []
        })
      )
    }

    await ensureMissingSocialIdentities(toolCtx, ops, accountClient, false)

    expect(accountClient.getPersonInfo).toHaveBeenCalledWith(empUuid)
  })
})
