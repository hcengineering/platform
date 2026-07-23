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

import {
  AccountRole,
  SocialIdType,
  type AccountUuid,
  type MeasureContext,
  type WorkspaceDataId,
  type WorkspaceUuid
} from '@hcengineering/core'
import {
  confirmRetype,
  deleteUser,
  deleteWorkspace,
  deleteWorkspaceStorage,
  type AccountAdmin,
  type AccountDbView,
  type Prompter,
  type StorageOps,
  type WorkspaceResolver
} from './deletion'

const wsUuid = (s: string): WorkspaceUuid => s as WorkspaceUuid
const acctUuid = (s: string): AccountUuid => s as AccountUuid

type CtxStub = MeasureContext & { info: jest.Mock }

function createCtx (): CtxStub {
  return { info: jest.fn() } as unknown as CtxStub
}

interface AuditCall {
  action: string
  attrs: Record<string, unknown>
}

function auditCalls (ctx: CtxStub): AuditCall[] {
  return ctx.info.mock.calls
    .filter((c: unknown[]) => typeof c[0] === 'string' && c[0].startsWith('audit.'))
    .map((c: unknown[]) => ({
      action: (c[0] as string).slice('audit.'.length),
      attrs: (c[1] ?? {}) as Record<string, unknown>
    }))
}

function createPrompter (answers: string[]): Prompter {
  let i = 0
  return {
    prompt: jest.fn(async () => answers[i++] ?? '')
  }
}

function createAccountDb (config: {
  byEmail?: Record<string, AccountUuid>
  workspaces?: Record<string, Array<{ uuid: WorkspaceUuid, url: string, dataId?: WorkspaceDataId }>>
  members?: Record<string, Array<{ person: AccountUuid, role: AccountRole }>>
}): AccountDbView {
  return {
    socialId: {
      findOne: jest.fn(async (q) => {
        if (q.type !== SocialIdType.EMAIL) return null
        const uuid = config.byEmail?.[q.value]
        return uuid != null ? { personUuid: uuid } : null
      })
    },
    getAccountWorkspaces: jest.fn(async (uuid) => config.workspaces?.[uuid] ?? []),
    getWorkspaceMembers: jest.fn(async (uuid) => config.members?.[uuid] ?? [])
  }
}

function createAccountAdmin (): AccountAdmin & {
  deleteAccount: jest.Mock
  performWorkspaceOperation: jest.Mock
} {
  return {
    deleteAccount: jest.fn(async () => {}),
    performWorkspaceOperation: jest.fn(async () => true)
  }
}

function createResolver (
  workspaces: Array<{ uuid: WorkspaceUuid, url: string, dataId?: WorkspaceDataId }>
): WorkspaceResolver {
  return {
    getWorkspace: jest.fn(async (idOrUrl) => {
      return workspaces.find((w) => w.uuid === idOrUrl || w.url === idOrUrl) ?? null
    })
  }
}

describe('confirmRetype', () => {
  it('accepts --yes preflight when it matches expected', async () => {
    const prompter = createPrompter([])
    const ok = await confirmRetype(prompter, 'acme-prod', { yes: 'acme-prod' })
    expect(ok).toBe(true)
    expect(prompter.prompt).not.toHaveBeenCalled()
  })

  it('rejects --yes preflight when it does not match', async () => {
    const prompter = createPrompter(['acme-prod'])
    const ok = await confirmRetype(prompter, 'acme-prod', { yes: 'acme-staging' })
    expect(ok).toBe(false)
    expect(prompter.prompt).not.toHaveBeenCalled()
  })

  it('falls back to interactive prompt and accepts exact match', async () => {
    const prompter = createPrompter(['acme-prod'])
    const ok = await confirmRetype(prompter, 'acme-prod', {})
    expect(ok).toBe(true)
    expect(prompter.prompt).toHaveBeenCalledTimes(1)
  })

  it('rejects interactive mismatch (case-sensitive, trimmed)', async () => {
    const prompter = createPrompter(['Acme-Prod'])
    const ok = await confirmRetype(prompter, 'acme-prod', {})
    expect(ok).toBe(false)
  })
})

describe('deleteUser', () => {
  it('refuses unknown email and audits nothing', async () => {
    const ctx = createCtx()
    const db = createAccountDb({ byEmail: {} })
    const admin = createAccountAdmin()
    const prompter = createPrompter([])

    const result = await deleteUser({
      ctx,
      db,
      admin,
      prompter,
      params: { email: 'ghost@nope.io', confirm: 'ghost@nope.io', operator: 'op@huly.io' }
    })

    expect(result.status).toBe('not-found')
    expect(admin.deleteAccount).not.toHaveBeenCalled()
    expect(auditCalls(ctx)).toEqual([])
  })

  it('refuses when user is sole Owner of a workspace and force is false', async () => {
    const ctx = createCtx()
    const uuid = acctUuid('user-1')
    const ws = wsUuid('ws-1')
    const db = createAccountDb({
      byEmail: { 'u@x.io': uuid },
      workspaces: { [uuid]: [{ uuid: ws, url: 'acme' }] },
      members: { [ws]: [{ person: uuid, role: AccountRole.Owner }] }
    })
    const admin = createAccountAdmin()
    const prompter = createPrompter([])

    const result = await deleteUser({
      ctx,
      db,
      admin,
      prompter,
      params: { email: 'u@x.io', confirm: 'u@x.io', operator: 'op@huly.io' }
    })

    expect(result.status).toBe('refused-sole-owner')
    expect(admin.deleteAccount).not.toHaveBeenCalled()
    expect(auditCalls(ctx).map((c) => c.action)).toEqual(['user.delete.refused'])
  })

  it('proceeds with --force even if sole Owner, and writes start+done audit', async () => {
    const ctx = createCtx()
    const uuid = acctUuid('user-2')
    const ws = wsUuid('ws-2')
    const db = createAccountDb({
      byEmail: { 'u@x.io': uuid },
      workspaces: { [uuid]: [{ uuid: ws, url: 'acme' }] },
      members: { [ws]: [{ person: uuid, role: AccountRole.Owner }] }
    })
    const admin = createAccountAdmin()
    const prompter = createPrompter([])

    const result = await deleteUser({
      ctx,
      db,
      admin,
      prompter,
      params: {
        email: 'u@x.io',
        confirm: 'u@x.io',
        force: true,
        reason: 'GDPR-123',
        operator: 'op@huly.io'
      }
    })

    expect(result.status).toBe('deleted')
    expect(admin.deleteAccount).toHaveBeenCalledWith(uuid)
    const audits = auditCalls(ctx)
    expect(audits.map((c) => c.action)).toEqual(['user.delete.start', 'user.delete.done'])
    expect(audits[0].attrs['audit.operator']).toBe('op@huly.io')
    expect(audits[0].attrs['audit.reason']).toBe('GDPR-123')
    expect(JSON.parse(audits[0].attrs['audit.target'] as string)).toEqual({
      kind: 'user',
      email: 'u@x.io',
      uuid
    })
  })

  it('refuses on bad confirmation and does not call deleteAccount', async () => {
    const ctx = createCtx()
    const uuid = acctUuid('user-3')
    const db = createAccountDb({ byEmail: { 'u@x.io': uuid } })
    const admin = createAccountAdmin()
    const prompter = createPrompter(['wrong'])

    const result = await deleteUser({
      ctx,
      db,
      admin,
      prompter,
      params: { email: 'u@x.io', confirm: 'wrong', operator: 'op@huly.io' }
    })

    expect(result.status).toBe('refused-confirmation')
    expect(admin.deleteAccount).not.toHaveBeenCalled()
    expect(auditCalls(ctx).map((c) => c.action)).toEqual(['user.delete.refused'])
  })

  it('dryRun reports plan but does not call deleteAccount and emits no audit', async () => {
    const ctx = createCtx()
    const uuid = acctUuid('user-4')
    const ws = wsUuid('ws-4')
    const db = createAccountDb({
      byEmail: { 'u@x.io': uuid },
      workspaces: { [uuid]: [{ uuid: ws, url: 'acme' }] },
      members: { [ws]: [{ person: uuid, role: AccountRole.User }] }
    })
    const admin = createAccountAdmin()
    const prompter = createPrompter([])

    const result = await deleteUser({
      ctx,
      db,
      admin,
      prompter,
      params: { email: 'u@x.io', dryRun: true, operator: 'op@huly.io' }
    })

    if (result.status !== 'dry-run') throw new Error(`expected dry-run, got ${result.status}`)
    expect(result.accountUuid).toBe(uuid)
    expect(result.workspaces.map((w) => w.uuid)).toEqual([ws])
    expect(admin.deleteAccount).not.toHaveBeenCalled()
    expect(auditCalls(ctx)).toEqual([])
  })
})

describe('deleteWorkspace', () => {
  it('marks workspace pending-deletion and audits start+marked', async () => {
    const ctx = createCtx()
    const ws = wsUuid('ws-100')
    const resolver = createResolver([{ uuid: ws, url: 'acme-prod' }])
    const admin = createAccountAdmin()
    const prompter = createPrompter([])

    const result = await deleteWorkspace({
      ctx,
      resolver,
      admin,
      prompter,
      params: { workspace: 'acme-prod', confirm: 'acme-prod', operator: 'op@huly.io', reason: 'ticket-7' }
    })

    expect(result.status).toBe('marked')
    expect(admin.performWorkspaceOperation).toHaveBeenCalledWith(ws, 'delete')
    const audits = auditCalls(ctx)
    expect(audits.map((c) => c.action)).toEqual(['workspace.delete.start', 'workspace.delete.marked'])
    expect(JSON.parse(audits[0].attrs['audit.target'] as string)).toEqual({
      kind: 'workspace',
      uuid: ws,
      url: 'acme-prod'
    })
    expect(audits[0].attrs['audit.reason']).toBe('ticket-7')
  })

  it('refuses on bad confirmation and emits a refused audit entry', async () => {
    const ctx = createCtx()
    const ws = wsUuid('ws-101')
    const resolver = createResolver([{ uuid: ws, url: 'acme-prod' }])
    const admin = createAccountAdmin()
    const prompter = createPrompter(['totally-wrong'])

    const result = await deleteWorkspace({
      ctx,
      resolver,
      admin,
      prompter,
      params: { workspace: 'acme-prod', confirm: 'totally-wrong', operator: 'op@huly.io' }
    })

    expect(result.status).toBe('refused-confirmation')
    expect(admin.performWorkspaceOperation).not.toHaveBeenCalled()
    expect(auditCalls(ctx).map((c) => c.action)).toEqual(['workspace.delete.refused'])
  })

  it('returns not-found when workspace is missing', async () => {
    const ctx = createCtx()
    const resolver = createResolver([])
    const admin = createAccountAdmin()

    const result = await deleteWorkspace({
      ctx,
      resolver,
      admin,
      prompter: createPrompter([]),
      params: { workspace: 'ghost', confirm: 'ghost', operator: 'op@huly.io' }
    })

    expect(result.status).toBe('not-found')
    expect(admin.performWorkspaceOperation).not.toHaveBeenCalled()
    expect(auditCalls(ctx)).toEqual([])
  })

  it('dryRun does not call performWorkspaceOperation and emits no audit', async () => {
    const ctx = createCtx()
    const ws = wsUuid('ws-102')
    const resolver = createResolver([{ uuid: ws, url: 'acme-prod' }])
    const admin = createAccountAdmin()

    const result = await deleteWorkspace({
      ctx,
      resolver,
      admin,
      prompter: createPrompter([]),
      params: { workspace: 'acme-prod', dryRun: true, operator: 'op@huly.io' }
    })

    expect(result.status).toBe('dry-run')
    expect(admin.performWorkspaceOperation).not.toHaveBeenCalled()
    expect(auditCalls(ctx)).toEqual([])
  })
})

describe('deleteWorkspaceStorage', () => {
  function createStorage (batches: Array<Array<{ _id: string, size?: number }>>): StorageOps & {
    remove: jest.Mock
    listStream: jest.Mock
  } {
    let cursor = 0
    return {
      listStream: jest.fn(async () => ({
        next: async () => batches[cursor++] ?? [],
        close: async () => {}
      })),
      remove: jest.fn(async () => {})
    }
  }

  it('dry-run is the default: reports counts but does not call remove or audit', async () => {
    const ctx = createCtx()
    const ws = wsUuid('ws-200')
    const resolver = createResolver([{ uuid: ws, url: 'acme-prod' }])
    const storage = createStorage([
      [
        { _id: 'a', size: 10 },
        { _id: 'b', size: 20 }
      ],
      [{ _id: 'c', size: 30 }]
    ])

    const result = await deleteWorkspaceStorage({
      ctx,
      resolver,
      storage,
      prompter: createPrompter([]),
      params: { workspace: 'acme-prod', operator: 'op@huly.io' }
    })

    if (result.status !== 'dry-run') throw new Error(`expected dry-run, got ${result.status}`)
    expect(result.objectCount).toBe(3)
    expect(result.totalBytes).toBe(60)
    expect(storage.remove).not.toHaveBeenCalled()
    expect(auditCalls(ctx)).toEqual([])
  })

  it('with apply: removes objects in batches and audits start+done', async () => {
    const ctx = createCtx()
    const ws = wsUuid('ws-201')
    const resolver = createResolver([{ uuid: ws, url: 'acme-prod', dataId: 'd-201' as WorkspaceDataId }])
    const storage = createStorage([[{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }], [{ _id: 'd' }]])

    const result = await deleteWorkspaceStorage({
      ctx,
      resolver,
      storage,
      prompter: createPrompter([]),
      params: {
        workspace: 'acme-prod',
        apply: true,
        confirm: 'acme-prod',
        batchSize: 2,
        operator: 'op@huly.io',
        reason: 'GDPR-99'
      }
    })

    if (result.status !== 'deleted') throw new Error(`expected deleted, got ${result.status}`)
    expect(result.objectCount).toBe(4)
    // remove() is bounded by batchSize across listStream batches: 4 ids @ size 2 -> 2 calls of 2.
    expect(storage.remove).toHaveBeenCalledTimes(2)
    const callArgs = (storage.remove as jest.Mock).mock.calls.map((c) => c[2])
    expect(callArgs).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ])
    const audits = auditCalls(ctx)
    expect(audits.map((c) => c.action)).toEqual(['workspace.storage.delete.start', 'workspace.storage.delete.done'])
    expect(audits[0].attrs['audit.reason']).toBe('GDPR-99')
  })

  it('with apply but bad confirmation: does not remove anything', async () => {
    const ctx = createCtx()
    const ws = wsUuid('ws-202')
    const resolver = createResolver([{ uuid: ws, url: 'acme-prod' }])
    const storage = createStorage([[{ _id: 'a' }]])

    const result = await deleteWorkspaceStorage({
      ctx,
      resolver,
      storage,
      prompter: createPrompter(['wrong']),
      params: { workspace: 'acme-prod', apply: true, confirm: 'wrong', operator: 'op@huly.io' }
    })

    expect(result.status).toBe('refused-confirmation')
    expect(storage.remove).not.toHaveBeenCalled()
    expect(auditCalls(ctx).map((c) => c.action)).toEqual(['workspace.storage.delete.refused'])
  })
})
