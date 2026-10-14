import core, { AccountRole } from '@hcengineering/core'

import { canAuthorGrantMentionAccess } from '../utils'

describe('canAuthorGrantMentionAccess', () => {
  const senderId = 'sender-social' as any
  const senderAccount = 'sender-account' as any
  const target = { _id: 'issue-1', _class: 'tracker:class:Issue', space: 'space-1' }

  function makeControl (role: AccountRole, isMember: boolean): any {
    return {
      ctx: {
        contextData: {
          account: { uuid: senderAccount, role },
          socialStringsToUsers: new Map([[senderId, { accontUuid: senderAccount, role }]])
        }
      },
      findAll: jest.fn(async (_ctx: any, _class: string) => [
        {
          _id: target.space,
          _class: core.class.Space,
          space: core.space.Space,
          members: isMember ? [senderAccount] : [],
          owners: []
        }
      ])
    }
  }

  test.each([
    ['guest', AccountRole.Guest, false, false],
    ['non-member user', AccountRole.User, false, false],
    ['member user', AccountRole.User, true, true],
    ['maintainer', AccountRole.Maintainer, false, true]
  ])('applies the policy to a %s author', async (_label, role, isMember, expected) => {
    await expect(canAuthorGrantMentionAccess({} as any, senderId, target as any, makeControl(role, isMember))).resolves.toBe(
      expected
    )
  })

  test('fails closed when the sender cannot be resolved', async () => {
    const control = makeControl(AccountRole.User, true)
    control.ctx.contextData.account = undefined
    control.ctx.contextData.socialStringsToUsers = new Map()

    await expect(canAuthorGrantMentionAccess({} as any, senderId, target as any, control)).resolves.toBe(false)
  })

  test('does not fall back to a different executing account (e.g. system) for an unknown sender', async () => {
    const control = makeControl(AccountRole.User, true)
    control.ctx.contextData.socialStringsToUsers = new Map()
    control.ctx.contextData.account = {
      uuid: 'system-account',
      role: AccountRole.Owner,
      primarySocialId: 'core:account:System',
      socialIds: ['core:account:System']
    }

    await expect(canAuthorGrantMentionAccess({} as any, senderId, target as any, control)).resolves.toBe(false)
  })

  test('uses the executing account when the sender is one of its social ids', async () => {
    const control = makeControl(AccountRole.User, true)
    control.ctx.contextData.socialStringsToUsers = new Map()
    control.ctx.contextData.account = {
      uuid: senderAccount,
      role: AccountRole.User,
      primarySocialId: senderId,
      socialIds: [senderId]
    }

    await expect(canAuthorGrantMentionAccess({} as any, senderId, target as any, control)).resolves.toBe(true)
  })

  test('does not trust a session entry that maps to another account than the sender lookup', async () => {
    const control = makeControl(AccountRole.Maintainer, false)
    control.ctx.contextData.socialStringsToUsers = new Map([[senderId, { accontUuid: senderAccount, role: AccountRole.Guest }]])

    await expect(canAuthorGrantMentionAccess({} as any, senderId, target as any, control)).resolves.toBe(false)
  })
})
