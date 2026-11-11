//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//

import {
  AccountRole,
  SocialIdType,
  type Account,
  type MeasureContext,
  type PersonId,
  type SocialId
} from '@hcengineering/core'

import contact from '..'
import { ensureEmployee } from '../utils'

const accountUuid = '00000000-0000-0000-0000-000000000001' as any
const socialId: SocialId = {
  _id: 'email:user@example.com' as PersonId,
  type: SocialIdType.EMAIL,
  value: 'user@example.com',
  key: 'email:user@example.com',
  verifiedOn: Date.now(),
  isDeleted: false
}

function makeAccount (role: AccountRole): Account {
  return {
    uuid: accountUuid,
    role,
    primarySocialId: socialId._id,
    socialIds: [socialId._id],
    fullSocialIds: [socialId]
  }
}

describe('workspace member provisioning', () => {
  // Both invite joins and OIDC role-sync joins reach this helper after the
  // workspace connection has resolved the assigned account role.
  const autoJoinRoles: Array<[AccountRole, 'USER' | 'GUEST']> = [
    [AccountRole.User, 'USER'],
    [AccountRole.Guest, 'GUEST']
  ]

  test.each(autoJoinRoles)(
    'an auto-joined %s gets the invite-path person, identity, and employee setup',
    async (role, employeeRole) => {
      const tx = jest.fn().mockResolvedValue(undefined)
      const client = {
        findOne: jest.fn().mockResolvedValue(undefined),
        findAll: jest.fn().mockResolvedValue([]),
        tx
      }
      const ctx = {
        with: jest.fn(async (_name: string, _attrs: object, callback: () => Promise<unknown>) => await callback())
      } as unknown as MeasureContext

      await ensureEmployee(
        ctx,
        makeAccount(role),
        client as any,
        [socialId],
        async () =>
          ({
            firstName: 'Auto',
            lastName: 'Joined'
          }) as any
      )

      expect(tx).toHaveBeenCalledTimes(3)
      const [createPerson, createSocialIdentity, createEmployee] = tx.mock.calls.map(([transaction]) => transaction)
      expect(createPerson.objectClass).toBe(contact.class.Person)
      expect(createSocialIdentity.objectClass).toBe(contact.class.SocialIdentity)
      expect(createSocialIdentity.collection).toBe('socialIds')
      expect(createSocialIdentity.attributes).toMatchObject({
        type: SocialIdType.EMAIL,
        value: 'user@example.com',
        isDeleted: false
      })
      expect(createEmployee.mixin).toBe(contact.mixin.Employee)
      expect(createEmployee.attributes).toEqual({ active: true, role: employeeRole })
    }
  )
})
