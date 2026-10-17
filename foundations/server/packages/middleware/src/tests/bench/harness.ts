//
// Copyright © 2026 TraceX SAS.
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
  type AccountUuid,
  AccountRole,
  type Class,
  ClassifierKind,
  type Data,
  type Doc,
  DOMAIN_MODEL,
  DOMAIN_TX,
  type FindOptions,
  type FindResult,
  generateId,
  Hierarchy,
  MeasureMetricsContext,
  type MeasureContext,
  ModelDb,
  type Obj,
  type Ref,
  type SessionData,
  type Space,
  type Tx,
  type TxCreateDoc,
  TxFactory,
  toFindResult,
  type WorkspaceUuid
} from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import type { DbAdapter, PipelineContext } from '@hcengineering/server-core'

const factory = new TxFactory(core.account.System)

function classTx (_class: Ref<Class<Obj>>, attributes: Data<Class<Obj>>): TxCreateDoc<Doc> {
  return factory.createTxCreateDoc(core.class.Class, core.space.Model, attributes, _class)
}

/**
 * Minimal core txes sufficient for hierarchy.getDomain / isDerived
 * on Space, Tx, TxCreateDoc, TxUpdateDoc, TxRemoveDoc.
 */
export function genCoreModel (): Tx[] {
  const txes: Tx[] = []
  txes.push(classTx(core.class.Obj, { label: 'Obj' as IntlString, kind: ClassifierKind.CLASS }))
  txes.push(
    classTx(core.class.Doc, { label: 'Doc' as IntlString, extends: core.class.Obj, kind: ClassifierKind.CLASS })
  )
  txes.push(
    classTx(core.class.AttachedDoc, {
      label: 'AttachedDoc' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.MIXIN
    })
  )
  txes.push(
    classTx(core.class.Class, {
      label: 'Class' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
    })
  )
  txes.push(
    classTx(core.class.Space, {
      label: 'Space' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
    })
  )
  txes.push(
    classTx(core.class.SystemSpace, {
      label: 'SystemSpace' as IntlString,
      extends: core.class.Space,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
    })
  )
  txes.push(
    classTx(core.class.Tx, {
      label: 'Tx' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_TX
    })
  )
  txes.push(
    classTx(core.class.TxCUD, {
      label: 'TxCUD' as IntlString,
      extends: core.class.Tx,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_TX
    })
  )
  txes.push(
    classTx(core.class.TxCreateDoc, {
      label: 'TxCreateDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    classTx(core.class.TxUpdateDoc, {
      label: 'TxUpdateDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    classTx(core.class.TxRemoveDoc, {
      label: 'TxRemoveDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    classTx(core.class.Collaborator, {
      label: 'Collaborator' as IntlString,
      extends: core.class.AttachedDoc,
      kind: ClassifierKind.CLASS
    })
  )
  return txes
}

export interface BenchHarness {
  ctx: MeasureContext<SessionData>
  hierarchy: Hierarchy
  modelDb: ModelDb
  pipelineContext: PipelineContext
  // Stub adapter used by `next` middleware - records calls
  findAllCalls: number
  resetFindCalls: () => void
}

export interface HarnessOptions {
  // Spaces to seed (returned from next.findAll on core.class.Space)
  spaces?: Array<{
    _id: Ref<Space>
    members: AccountUuid[]
    private: boolean
    _class?: Ref<Class<Space>>
    archived?: boolean
  }>
}

/**
 * Create base harness: real Hierarchy loaded with core model, real ModelDb,
 * stub adapter, mocked broadcast, session data with system account.
 */
export function createHarness (opts: HarnessOptions = {}): BenchHarness {
  const ctx = new MeasureMetricsContext('bench', {}) as MeasureContext<SessionData>
  const hierarchy = new Hierarchy()
  const modelDb = new ModelDb(hierarchy)

  const model = genCoreModel()
  for (const tx of model) {
    hierarchy.tx(tx)
  }
  modelDb.addTxes(ctx, model, true)

  const harness: BenchHarness = {
    ctx,
    hierarchy,
    modelDb,
    pipelineContext: undefined as any,
    findAllCalls: 0,
    resetFindCalls: () => {
      harness.findAllCalls = 0
    }
  }

  const seededSpaces = opts.spaces ?? []
  const spacesAsDocs: Space[] = seededSpaces.map((s) => ({
    _id: s._id,
    _class: s._class ?? core.class.Space,
    space: core.space.Space,
    members: s.members,
    private: s.private,
    archived: s.archived ?? false,
    name: 'space',
    description: '',
    modifiedBy: core.account.System,
    modifiedOn: 0
  }))

  const stubAdapter: Partial<DbAdapter> = {
    findAll: async (_c, _class, _q, _o) => {
      harness.findAllCalls++
      return toFindResult([])
    },
    groupBy: async () => new Map()
  }

  const pipelineContext: PipelineContext = {
    workspace: { uuid: 'bench-ws' as WorkspaceUuid, url: 'bench', dataId: 'bench' as any },
    hierarchy,
    modelDb,
    branding: null,
    adapterManager: {
      getAdapter: () => stubAdapter as DbAdapter
    } as any,
    storageAdapter: {} as any,
    contextVars: {},
    lastTx: '',
    lastHash: '',
    broadcastEvent: async () => {}
  }
  harness.pipelineContext = pipelineContext

  // Patch the next.findAll on the (so-far missing) `next` middleware:
  // by convention each bench supplies its own `next` mock that returns seeded spaces.
  ;(harness as any).seededSpaces = spacesAsDocs

  setupSession(ctx, AccountRole.User)
  return harness
}

/**
 * Build a no-op `next` Middleware that returns seeded spaces for
 * `findAll(core.class.Space, ...)` and otherwise empty results.
 */
export function makeNextMiddleware (
  harness: BenchHarness,
  overrides: Partial<{
    findAll: <T extends Doc>(
      ctx: MeasureContext,
      _class: Ref<Class<T>>,
      query: any,
      options?: FindOptions<T>
    ) => Promise<FindResult<T>>
    groupBy: (ctx: MeasureContext, domain: string, field: string) => Promise<Map<any, number>>
    tx: (ctx: MeasureContext, txes: Tx[]) => Promise<any>
  }> = {}
): any {
  const seededSpaces: Space[] = (harness as any).seededSpaces ?? []
  return {
    findAll:
      overrides.findAll ??
      (async <T extends Doc>(_ctx: MeasureContext, _class: Ref<Class<T>>, _q: any, _o?: FindOptions<T>) => {
        harness.findAllCalls++
        if (_class === core.class.Space || harness.hierarchy.isDerived(_class, core.class.Space)) {
          return toFindResult(seededSpaces as unknown as T[])
        }
        return toFindResult<T>([])
      }),
    groupBy:
      overrides.groupBy ??
      (async (_ctx: MeasureContext, _domain: string, _field: string) => {
        // For domain-spaces cache: pretend every seeded space is present in every domain we ask about.
        const m = new Map<any, number>()
        for (const s of seededSpaces) {
          m.set(s._id, 1)
        }
        return m
      }),
    tx: overrides.tx ?? (async () => ({})),
    handleBroadcast: async () => {},
    close: async () => {}
  }
}

/**
 * Populate ctx.contextData with a session impersonating a user.
 */
export function setupSession (
  ctx: MeasureContext<SessionData>,
  role: AccountRole = AccountRole.User,
  accountUuid: AccountUuid = 'bench-user' as AccountUuid
): void {
  const account = {
    uuid: accountUuid,
    role,
    primarySocialId: 'bench-social' as any,
    socialIds: ['bench-social' as any],
    fullSocialIds: []
  }
  ctx.contextData = {
    account,
    sessionId: 'bench-session',
    isAsyncContext: false,
    socialStringsToUsers: new Map([['bench-social', { accountUuid, role, socialIds: ['bench-social'] }] as any]),
    contextCache: new Map(),
    removedMap: new Map(),
    asyncRequests: [],
    broadcast: {
      txes: [],
      targets: {},
      queue: [],
      sessions: {}
    },
    modelDb: undefined,
    workspace: { uuid: 'bench-ws' as WorkspaceUuid, url: 'bench', dataId: 'bench' as any }
  } as any
}

export function makeSpaces (
  count: number,
  memberAccount: AccountUuid
): Array<{
  _id: Ref<Space>
  members: AccountUuid[]
  private: boolean
}> {
  const out: Array<{ _id: Ref<Space>, members: AccountUuid[], private: boolean }> = []
  for (let i = 0; i < count; i++) {
    out.push({
      _id: generateId(),
      // ~half of spaces include the test user
      members: i % 2 === 0 ? [memberAccount] : [],
      private: i % 3 === 0
    })
  }
  return out
}
