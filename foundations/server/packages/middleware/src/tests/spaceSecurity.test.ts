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

import core, {
  AccountRole,
  MeasureMetricsContext,
  generateId,
  toFindResult,
  type Account,
  type AccountUuid,
  type Class,
  type ClassCollaborators,
  type Collaborator,
  type Doc,
  type Domain,
  type MeasureContext,
  type PersonId,
  type Ref,
  type SessionData
} from '@hcengineering/core'
import type { Middleware, PipelineContext } from '@hcengineering/server-core'
import { SpaceSecurityMiddleware } from '../spaceSecurity'

const DOC_CLASS = 'test:class:Doc' as Ref<Class<Doc>>
const DOC_ID = 'test:doc:1' as Ref<Doc>
const TEST_DOMAIN = 'test-domain' as Domain

function makeAccount (role: AccountRole): Account {
  return {
    uuid: generateId() as unknown as AccountUuid,
    role,
    primarySocialId: 'test-social' as PersonId,
    socialIds: ['test-social' as PersonId],
    fullSocialIds: []
  }
}

function makeCtx (account: Account): MeasureContext<SessionData> {
  const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
  ctx.contextData = {
    account,
    broadcast: { txes: [], queue: [], sessions: {} },
    socialStringsToUsers: new Map(),
    contextCache: new Map()
  } as unknown as SessionData
  return ctx
}

function makeMiddleware (
  role: AccountRole,
  opts: { provideSecurity: boolean } = { provideSecurity: false }
): { mw: SpaceSecurityMiddleware, account: Account, calls: Array<{ cls: Ref<Class<Doc>>, query: any }> } {
  const account = makeAccount(role)
  const calls: Array<{ cls: Ref<Class<Doc>>, query: any }> = []
  const collabMixin = {
    _id: generateId(),
    _class: core.class.ClassCollaborators,
    space: core.space.Model,
    attachedTo: DOC_CLASS,
    fields: ['createdBy'],
    provideSecurity: opts.provideSecurity,
    modifiedOn: Date.now(),
    modifiedBy: core.account.System
  } as unknown as ClassCollaborators<Doc>

  // Partial Hierarchy test double — SpaceSecurityMiddleware only needs these methods for this test.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- full Hierarchy is not needed here
  const hierarchy = {
    getDomain: (_class: Ref<Class<Doc>>) => TEST_DOMAIN,
    isDerived: (_class: Ref<Class<Doc>>, base: Ref<Class<Doc>>) =>
      base === core.class.Space && _class === core.class.Space,
    getDescendants: (_class: Ref<Class<Doc>>) => [] as Ref<Class<Doc>>[],
    getAncestors: (_class: Ref<Class<Doc>>) => [_class]
  } as PipelineContext['hierarchy']

  const modelDb = {
    findAllSync: (cl: Ref<Class<Doc>>, query: { attachedTo?: { $in?: Ref<Class<Doc>>[] } }) => {
      if (cl !== core.class.ClassCollaborators) return []
      const ids = query.attachedTo?.$in ?? []
      return ids.includes(DOC_CLASS) ? [collabMixin] : []
    }
  } as unknown as PipelineContext['modelDb']

  const next: Middleware = {
    findAll: async <T extends Doc>(_ctx: MeasureContext<SessionData>, _class: Ref<Class<T>>, query: any) => {
      calls.push({ cls: _class as unknown as Ref<Class<Doc>>, query: JSON.parse(JSON.stringify(query)) })
      if (_class === (core.class.Space as unknown as Ref<Class<T>>)) {
        return toFindResult([]) as any
      }
      if (_class === (core.class.Collaborator as unknown as Ref<Class<T>>)) {
        const collabDoc: Collaborator = {
          _id: generateId(),
          _class: core.class.Collaborator,
          space: core.space.Workspace,
          attachedTo: DOC_ID,
          attachedToClass: DOC_CLASS,
          collection: 'collaborators',
          collaborator: account.uuid,
          modifiedOn: Date.now(),
          modifiedBy: core.account.System
        }
        return toFindResult([collabDoc]) as any
      }
      return toFindResult([]) as any
    },
    tx: async () => ({}),
    groupBy: async () => new Map(),
    searchFulltext: async () => ({ docs: [] }) as any,
    handleBroadcast: async () => {},
    loadModel: async () => [],
    domainRequest: async () => ({ value: undefined }) as any,
    closeSession: async () => {},
    close: async () => {}
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- minimal PipelineContext stub for unit test
  const context = {
    workspace: { uuid: generateId() as any, url: 'test', dataId: 'test' as any },
    hierarchy,
    modelDb,
    branding: null as any,
    adapterManager: {} as any,
    storageAdapter: {} as any,
    contextVars: {},
    lastTx: '',
    lastHash: '',
    broadcastEvent: async () => {}
  } as PipelineContext

  const mw = new (SpaceSecurityMiddleware as any)(false, context, next) as SpaceSecurityMiddleware
  return { mw, account, calls }
}

describe('SpaceSecurityMiddleware guest collaborator read restriction', () => {
  it('applies collaborator _id filter for guest when provideSecurity is enabled', async () => {
    const { mw, account, calls } = makeMiddleware(AccountRole.Guest, { provideSecurity: true })
    const ctx = makeCtx(account)

    await mw.findAll(ctx, DOC_CLASS, { title: 'Meeting minutes' })

    expect(calls).toHaveLength(3)
    expect(calls[1].cls).toBe(core.class.Collaborator)
    expect(calls[2].cls).toBe(DOC_CLASS)
    expect(calls[2].query).toEqual({
      title: 'Meeting minutes',
      _id: { $in: [DOC_ID] }
    })
  })

  it('keeps query unchanged for regular user', async () => {
    const { mw, account, calls } = makeMiddleware(AccountRole.User, { provideSecurity: true })
    const ctx = makeCtx(account)

    await mw.findAll(ctx, DOC_CLASS, { title: 'Meeting minutes' })

    expect(calls).toHaveLength(2)
    expect(calls[1].cls).toBe(DOC_CLASS)
    expect(calls[1].query).toEqual({ title: 'Meeting minutes' })
  })
})
