//
// Copyright © 2026 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
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
  type Account,
  type Class,
  type Collaborator,
  type Doc,
  type DomainResult,
  generateId,
  type Hierarchy,
  MeasureMetricsContext,
  type MeasureContext,
  type PersonId,
  type Ref,
  type SearchResult,
  type SessionData,
  systemAccountUuid,
  Timestamp,
  toFindResult
} from '@hcengineering/core'
import type { Middleware, PipelineContext } from '@hcengineering/server-core'
import { GuestCollaboratorClassReadMiddleware } from '../guestCollaboratorClassRead'

const MEETING_MINUTES_CLASS = 'test:love:class:MeetingMinutes' as Ref<Class<Doc>>
const DOC_CLASS = core.class.Doc

function makeAccount (role: AccountRole, uuid?: ReturnType<typeof generateId>): Account {
  return {
    uuid: (uuid ?? generateId()) as Account['uuid'],
    role,
    primarySocialId: 'test-social' as PersonId,
    socialIds: ['test-social' as PersonId],
    fullSocialIds: []
  }
}

function makeCtx (account: Account, extra?: Partial<SessionData>): MeasureContext<SessionData> {
  const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
  ctx.contextData = {
    account,
    broadcast: { txes: [], queue: [], sessions: {} },
    ...extra
  } as SessionData
  return ctx
}

function makeCollaboratorDoc (attachedTo: Ref<Doc>, collaborator: Account['uuid']): Collaborator {
  return {
    _id: generateId(),
    _class: core.class.Collaborator,
    space: core.space.Workspace,
    attachedTo,
    attachedToClass: MEETING_MINUTES_CLASS,
    collection: 'collaborators',
    collaborator,
    modifiedOn: Date.now(),
    modifiedBy: core.account.System
  }
}

function makePipelineContext (): PipelineContext {
  const collaboratorsMixin = {
    _id: generateId(),
    _class: core.class.ClassCollaborators,
    space: core.space.Model,
    attachedTo: MEETING_MINUTES_CLASS,
    fields: ['createdBy'],
    provideSecurity: true,
    guestReadCollaboratorOnly: true,
    modifiedOn: Date.now(),
    modifiedBy: core.account.System
  } as Doc

  const hierarchy = {
    getAncestors: (c: Ref<Class<Doc>>) => [c, DOC_CLASS],
    getDescendants: (_c: Ref<Class<Doc>>) => [] as Ref<Class<Doc>>[]
  } as unknown as Hierarchy

  const modelDb = {
    findAllSync: (cl: Ref<Class<Doc>>, query: { attachedTo?: { $in?: Ref<Class<Doc>>[] } }) => {
      if (cl !== core.class.ClassCollaborators) return []
      const ids = query.attachedTo?.$in ?? []
      return ids.includes(MEETING_MINUTES_CLASS) ? [collaboratorsMixin] : []
    }
  } as PipelineContext['modelDb']

  return {
    workspace: { uuid: generateId() as any, url: 'test', dataId: 'test' as any },
    hierarchy,
    modelDb,
    branding: null as any,
    adapterManager: {} as any,
    storageAdapter: {} as any,
    contextVars: {},
    lastTx: '' as Timestamp,
    lastHash: '',
    broadcastEvent: async () => {}
  } as PipelineContext
}

function stubMiddleware (): Middleware {
  return {
    findAll: async () => toFindResult([]),
    tx: async () => ({}),
    groupBy: async () => new Map(),
    searchFulltext: async () => ({ docs: [] }) as SearchResult,
    handleBroadcast: async () => {},
    loadModel: async () => [],
    domainRequest: async () => ({ value: undefined }) as DomainResult,
    closeSession: async () => {},
    close: async () => {}
  } satisfies Middleware
}

describe('GuestCollaboratorClassReadMiddleware', () => {
  const MM_ID = generateId() as Ref<Doc>

  it('User: passes original query in a single findAll', async () => {
    const captured: Array<{ cls: string; query: unknown }> = []
    const next: Middleware = {
      ...stubMiddleware(),
      findAll: async (ctx, _class, query, options) => {
        captured.push({ cls: _class as string, query: { ...query } })
        return toFindResult([])
      }
    }
    const mw = new GuestCollaboratorClassReadMiddleware(makePipelineContext(), next)
    const ctx = makeCtx(makeAccount(AccountRole.User))
    await mw.findAll(ctx, MEETING_MINUTES_CLASS, { attachedTo: MM_ID })
    expect(captured).toHaveLength(1)
    expect(captured[0].cls).toBe(MEETING_MINUTES_CLASS)
    expect(captured[0].query).toEqual({ attachedTo: MM_ID })
  })

  it('Guest: loads collaborators then restricts MeetingMinutes to collaborator attachedTo ids', async () => {
    const guest = makeAccount(AccountRole.Guest)
    const collabDoc = makeCollaboratorDoc(MM_ID, guest.uuid)
    const captured: Array<{ cls: string; query: unknown }> = []
    const next: Middleware = {
      ...stubMiddleware(),
      findAll: async (c, _class, query) => {
        captured.push({ cls: _class as string, query: JSON.parse(JSON.stringify(query)) })
        if (_class === core.class.Collaborator) {
          return toFindResult([collabDoc])
        }
        return toFindResult([])
      }
    }
    const mw = new GuestCollaboratorClassReadMiddleware(makePipelineContext(), next)
    const ctx = makeCtx(guest)
    await mw.findAll(ctx, MEETING_MINUTES_CLASS, { space: core.space.Workspace })
    expect(captured).toHaveLength(2)
    expect(captured[0].cls).toBe(core.class.Collaborator)
    expect((captured[0].query as any).collaborator).toBe(guest.uuid)
    expect(captured[1].cls).toBe(MEETING_MINUTES_CLASS)
    expect((captured[1].query as any)._id).toEqual({ $in: [MM_ID] })
  })

  it('Guest: empty collaborator list yields _id $in []', async () => {
    const guest = makeAccount(AccountRole.Guest)
    const captured: Array<{ cls: string; query: unknown }> = []
    const next: Middleware = {
      ...stubMiddleware(),
      findAll: async (c, _class, query) => {
        captured.push({ cls: _class as string, query: JSON.parse(JSON.stringify(query)) })
        if (_class === core.class.Collaborator) {
          return toFindResult([])
        }
        return toFindResult([])
      }
    }
    const mw = new GuestCollaboratorClassReadMiddleware(makePipelineContext(), next)
    const ctx = makeCtx(guest)
    await mw.findAll(ctx, MEETING_MINUTES_CLASS, {})
    expect(captured).toHaveLength(2)
    const mmQuery = captured[1].query as { _id: { $in: unknown[] } }
    expect(mmQuery._id).toEqual({ $in: [] })
  })

  it('Guest: without guestReadCollaboratorOnly on class config, query is unchanged', async () => {
    const bareContext = {
      ...makePipelineContext(),
      modelDb: {
        findAllSync: () => []
      } as PipelineContext['modelDb']
    } as PipelineContext

    const captured: unknown[] = []
    const next: Middleware = {
      ...stubMiddleware(),
      findAll: async (c, _class, query) => {
        captured.push(query)
        return toFindResult([])
      }
    }
    const mw = new GuestCollaboratorClassReadMiddleware(bareContext, next)
    const ctx = makeCtx(makeAccount(AccountRole.Guest))
    await mw.findAll(ctx, MEETING_MINUTES_CLASS, { space: core.space.Workspace })
    expect(captured).toHaveLength(1)
    expect(captured[0]).toEqual({ space: core.space.Workspace })
  })

  it('system account: no collaborator prefetch', async () => {
    let calls = 0
    const next: Middleware = {
      ...stubMiddleware(),
      findAll: async () => {
        calls++
        return toFindResult([])
      }
    }
    const mw = new GuestCollaboratorClassReadMiddleware(makePipelineContext(), next)
    const ctx = makeCtx({
      uuid: systemAccountUuid,
      role: AccountRole.Owner,
      primarySocialId: core.account.System,
      socialIds: [core.account.System],
      fullSocialIds: []
    })
    await mw.findAll(ctx, MEETING_MINUTES_CLASS, {})
    expect(calls).toBe(1)
  })

  it('Guest: merges existing _id constraint with $and', async () => {
    const guest = makeAccount(AccountRole.Guest)
    const otherId = generateId() as Ref<Doc>
    const collabDoc = makeCollaboratorDoc(MM_ID, guest.uuid)
    const captured: unknown[] = []
    const next: Middleware = {
      ...stubMiddleware(),
      findAll: async (c, _class, query) => {
        captured.push(JSON.parse(JSON.stringify(query)))
        if (_class === core.class.Collaborator) {
          return toFindResult([collabDoc])
        }
        return toFindResult([])
      }
    }
    const mw = new GuestCollaboratorClassReadMiddleware(makePipelineContext(), next)
    const ctx = makeCtx(guest)
    await mw.findAll(ctx, MEETING_MINUTES_CLASS, { _id: otherId })
    const mmQuery = captured[1] as any
    expect(mmQuery.$and).toBeDefined()
    expect(mmQuery.$and).toEqual(
      expect.arrayContaining([{ _id: otherId }, { _id: { $in: [MM_ID] } }])
    )
  })
})
