import { AccountRole, type MeasureContext } from '@hcengineering/core'

import {
  getAllowedGroups,
  getOidcWorkspaceRoles,
  parseOidcRoleGroupRules,
  resolveOidcRoleGroupRules,
  warnOnEmptyAutoAllowedGroups,
  type ResolvedOidcRoleGroupRule
} from '../oidcRoleGroups'

const workspaceOne = '00000000-0000-0000-0000-000000000001' as any
const workspaceTwo = '00000000-0000-0000-0000-000000000002' as any

const rules: ResolvedOidcRoleGroupRule[] = [
  { workspaceUrl: 'engineering', workspaceUuid: workspaceOne, group: 'owners', role: AccountRole.Owner },
  { workspaceUrl: 'engineering', workspaceUuid: workspaceOne, group: 'members', role: AccountRole.User },
  { workspaceUrl: 'guests', workspaceUuid: workspaceTwo, group: 'visitors', role: AccountRole.Guest }
]

describe('OIDC workspace role group rules', () => {
  test('parses normalized rule triples and ignores malformed rules', () => {
    expect(
      parseOidcRoleGroupRules(
        ' Engineering : Owners = owner ; guests:Visitors=GUEST; bad:group=ADMIN; bad:group=USER=OWNER '
      )
    ).toEqual({
      rules: [
        { workspaceUrl: 'engineering', group: 'owners', role: AccountRole.Owner },
        { workspaceUrl: 'guests', group: 'visitors', role: AccountRole.Guest }
      ],
      invalidRuleCount: 2
    })
  })

  test('rejects group names containing a comma', () => {
    expect(parseOidcRoleGroupRules('sales:Sales, EMEA=USER')).toEqual({ rules: [], invalidRuleCount: 1 })
  })

  test('uses the highest matching role for each configured workspace', () => {
    expect(getOidcWorkspaceRoles({ groups: [' MEMBERS ', 'owners', 'VISITORS'] }, rules)).toEqual([
      { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role: AccountRole.Owner },
      { workspaceUuid: workspaceTwo, workspaceUrl: 'guests', role: AccountRole.Guest }
    ])
  })

  test('marks a configured workspace for removal when no group matches', () => {
    expect(getOidcWorkspaceRoles({ groups: ['unrelated'] }, rules)).toEqual([
      { workspaceUuid: workspaceOne, workspaceUrl: 'engineering', role: null },
      { workspaceUuid: workspaceTwo, workspaceUrl: 'guests', role: null }
    ])
  })

  test.each([{ sub: 'subject' }, { _claim_names: { groups: 'source' } }])(
    'does not produce changes for unavailable groups',
    (claims) => {
      expect(getOidcWorkspaceRoles(claims, rules)).toBeUndefined()
    }
  )

  test('derives the auto allowlist from resolved rules only', () => {
    expect(getAllowedGroups('auto', rules)).toBe('owners,members,visitors')
    expect(getAllowedGroups('team-a, team-b', rules)).toBe('team-a, team-b')
  })

  test('fails closed and warns when auto resolves no valid role rules', () => {
    const measureCtx = { warn: jest.fn() } as unknown as MeasureContext

    expect(getAllowedGroups('auto', [])).toBeNull()
    warnOnEmptyAutoAllowedGroups(measureCtx, 'auto', [])

    expect(measureCtx.warn).toHaveBeenCalledWith(
      'OPENID_ALLOWED_GROUPS=auto has no valid resolved role rules; denying all OIDC logins'
    )
  })

  test('warns for malformed and unknown-workspace rules without exposing group names', async () => {
    const measureCtx = { warn: jest.fn() } as unknown as MeasureContext
    const db = {
      workspace: {
        findOne: jest.fn(async ({ url }: { url: string }) =>
          url === 'engineering' ? { uuid: workspaceOne, url } : null
        )
      }
    }

    const resolved = await resolveOidcRoleGroupRules(
      measureCtx,
      db as any,
      'engineering:owners=OWNER;missing:secret-group=USER;wrong=USER'
    )

    expect(resolved).toEqual([
      { workspaceUrl: 'engineering', workspaceUuid: workspaceOne, group: 'owners', role: AccountRole.Owner }
    ])
    expect(measureCtx.warn).toHaveBeenCalledWith('Ignoring invalid OPENID_ROLE_GROUPS rules', { count: 1 })
    expect(measureCtx.warn).toHaveBeenCalledWith('Ignoring OPENID_ROLE_GROUPS rule for unknown workspace', {
      workspace: 'missing'
    })
    expect(JSON.stringify((measureCtx.warn as jest.Mock).mock.calls)).not.toContain('secret-group')
  })
})
