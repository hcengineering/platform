//
// Copyright © 2025 Hardcore Engineering Inc.
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

/**
 * H5 - Collab-read bypass must be backend-guarded (fail-closed).
 *
 * The three collab-read bypasses in SpaceSecurityMiddleware.findAll drop the
 * space filter and delegate the restriction to the adapter's collab OR-branch,
 * which only exists in the Postgres adapter (postgres/src/storage.ts addSecurity).
 * On a backend without an equivalent clause (Mongo has none) dropping the space
 * filter would leak docs across spaces.
 *
 * These tests drive findAll with a mocked pipeline and capture the query that
 * leaves the middleware towards the adapter:
 *  - backend supports collab security  -> bypass fires  -> space filter dropped
 *  - backend does NOT (Mongo/unknown)  -> bypass skipped -> space filter kept
 */

import core, {
  AccountRole,
  generateId,
  MeasureMetricsContext,
  toFindResult,
  type Account,
  type Class,
  type Doc,
  type Domain,
  type MeasureContext,
  type PersonId,
  type Ref,
  type SessionData,
  type Space
} from '@hcengineering/core'
import type { PipelineContext } from '@hcengineering/server-core'
import { SpaceSecurityMiddleware } from '../spaceSecurity'

const ISSUE_CLASS = 'test:class:Issue' as Ref<Class<Doc>>
const ISSUE_DOMAIN = 'test-issue' as Domain
const SPACE_CLASS = core.class.Space
const COLLAB_CLASS = core.class.Collaborator

const S1 = 'test:space:S1' as Ref<Space> // guest IS a member
const S2 = 'test:space:S2' as Ref<Space> // guest is NOT a member (collab-only)

function makeGuest (): Account {
  return {
    uuid: generateId() as any,
    role: AccountRole.Guest,
    primarySocialId: 'test' as PersonId,
    socialIds: ['test' as PersonId],
    fullSocialIds: []
  }
}

function makeCtx (account: Account): MeasureContext<SessionData> {
  const ctx = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
  ctx.contextData = {
    account,
    socialStringsToUsers: new Map(),
    broadcast: { txes: [], queue: [], sessions: {} }
  } as any
  return ctx
}

interface Captured {
  query?: any
}

function admittedSpaces (filterValue: any): Array<Ref<Space>> {
  if (filterValue === undefined) return []
  if (typeof filterValue === 'object' && Array.isArray(filterValue.$in)) return filterValue.$in
  return [filterValue]
}

/**
 * Build a SpaceSecurityMiddleware wired to a mocked pipeline.
 *
 * backendSupportsCollab: whether the adapter serving the domain declares
 *   supportsCollaboratorSecurity (true = Postgres-like, false = Mongo-like).
 * noAdapterManager: simulate a pipeline without an adapter manager.
 * provideSecurity: whether the queried class opts into collab read security.
 * derivedFromSpace / derivedFromCollaborator: how `_class` reports isDerived.
 */
function makeMiddleware (opts: {
  backendSupportsCollab?: boolean
  noAdapterManager?: boolean
  provideSecurity?: boolean
  derivedFromSpace?: boolean
  derivedFromCollaborator?: boolean
}): { mw: SpaceSecurityMiddleware, captured: Captured } {
  const captured: Captured = {}

  const collabConfig = opts.provideSecurity === true ? [{ attachedTo: ISSUE_CLASS, provideSecurity: true } as any] : []

  const hierarchy = {
    getDomain: (_class: Ref<Class<Doc>>): Domain => {
      if (_class === SPACE_CLASS) return 'space' as Domain
      if (_class === COLLAB_CLASS) return 'collaborator' as Domain
      return ISSUE_DOMAIN
    },
    isDerived: (a: Ref<Class<Doc>>, b: Ref<Class<Doc>>): boolean => {
      if (b === core.class.Space) return opts.derivedFromSpace === true
      if (b === core.class.Collaborator) return opts.derivedFromCollaborator === true
      return a === b
    },
    getAncestors: (_class: Ref<Class<Doc>>): Array<Ref<Class<Doc>>> => [_class]
  }

  const modelDb = {
    findAllSync: (_class: Ref<Class<Doc>>): any[] => {
      if (_class === core.class.ClassCollaborators) return collabConfig
      return []
    }
  }

  const adapterManager =
    opts.noAdapterManager === true
      ? undefined
      : {
          getAdapterName: (_domain: Domain): string => 'default',
          getAdapterByName: (_name: string): any => ({
            supportsCollaboratorSecurity: opts.backendSupportsCollab === true ? true : undefined
          })
        }

  const context = {
    workspace: { uuid: 'test-workspace' as any, url: 'test', dataId: 'test' as any },
    hierarchy,
    modelDb,
    branding: null,
    adapterManager,
    contextVars: {}
  } as unknown as PipelineContext

  const next = {
    findAll: async (_ctx: MeasureContext, _class: Ref<Class<Doc>>, query: any) => {
      captured.query = query
      return toFindResult([])
    },
    // Domain spaces for the queried domain: S1 and S2 both host docs.
    groupBy: async () =>
      new Map<Ref<Space>, number>([
        [S1, 1],
        [S2, 1]
      ])
  }

  const mw = new (SpaceSecurityMiddleware as any)(false, context, next)
  // Skip async init (would call next.findAll for Space); we seed state directly.
  mw.wasInit = true

  return { mw, captured }
}

describe('SpaceSecurityMiddleware - collab-read backend guard (H5)', () => {
  describe('collabReadBypass (Guest reading a collab-secured Doc class)', () => {
    it('Mongo/unknown backend: does NOT drop the space filter (fail-closed, no cross-space leak)', async () => {
      const { mw, captured } = makeMiddleware({ backendSupportsCollab: false, provideSecurity: true })
      const account = makeGuest()
      ;(mw as any).allowedSpaces = { [account.uuid]: [S1] } // member of S1 only

      await mw.findAll(makeCtx(account), ISSUE_CLASS, {})

      // Space filter must be present and must NOT admit S2 (the collab-only space).
      expect(captured.query.space).toBeDefined()
      const admitted = admittedSpaces(captured.query.space)
      expect(admitted).not.toContain(S2)
      expect(admitted).toContain(S1)
    })

    it('Postgres backend: drops the space filter so the adapter collab-branch can widen visibility', async () => {
      const { mw, captured } = makeMiddleware({ backendSupportsCollab: true, provideSecurity: true })
      const account = makeGuest()
      ;(mw as any).allowedSpaces = { [account.uuid]: [S1] }

      await mw.findAll(makeCtx(account), ISSUE_CLASS, {})

      // Bypass fired: no middleware-level space filter (adapter enforces collab security).
      expect(captured.query.space).toBeUndefined()
    })
  })

  describe('selfCollabBypass (reading the Collaborator class)', () => {
    it('Mongo/unknown backend: keeps the space filter', async () => {
      const { mw, captured } = makeMiddleware({ backendSupportsCollab: false, derivedFromCollaborator: true })
      const account = makeGuest()
      ;(mw as any).allowedSpaces = { [account.uuid]: [S1] }

      await mw.findAll(makeCtx(account), COLLAB_CLASS, {})

      expect(captured.query.space).toBeDefined()
      expect(admittedSpaces(captured.query.space)).not.toContain(S2)
    })

    it('Postgres backend: drops the space filter', async () => {
      const { mw, captured } = makeMiddleware({ backendSupportsCollab: true, derivedFromCollaborator: true })
      const account = makeGuest()
      ;(mw as any).allowedSpaces = { [account.uuid]: [S1] }

      await mw.findAll(makeCtx(account), COLLAB_CLASS, {})

      expect(captured.query.space).toBeUndefined()
    })
  })

  describe('spaceCollabBypass (Guest listing Spaces)', () => {
    it('Mongo/unknown backend: keeps the _id space filter', async () => {
      const { mw, captured } = makeMiddleware({ backendSupportsCollab: false, derivedFromSpace: true })
      const account = makeGuest()
      ;(mw as any).allowedSpaces = { [account.uuid]: [S1] }

      await mw.findAll(makeCtx(account), SPACE_CLASS, {})

      // For the space domain the filter field is `_id`.
      expect(captured.query._id).toBeDefined()
      expect(admittedSpaces(captured.query._id)).not.toContain(S2)
    })

    it('Postgres backend: drops the _id space filter', async () => {
      const { mw, captured } = makeMiddleware({ backendSupportsCollab: true, derivedFromSpace: true })
      const account = makeGuest()
      ;(mw as any).allowedSpaces = { [account.uuid]: [S1] }

      await mw.findAll(makeCtx(account), SPACE_CLASS, {})

      expect(captured.query._id).toBeUndefined()
    })
  })

  describe('fail-closed when no adapterManager is available', () => {
    it('keeps the space filter even for a collab-secured class', async () => {
      const { mw, captured } = makeMiddleware({ noAdapterManager: true, provideSecurity: true })
      const account = makeGuest()
      ;(mw as any).allowedSpaces = { [account.uuid]: [S1] }

      await mw.findAll(makeCtx(account), ISSUE_CLASS, {})

      expect(captured.query.space).toBeDefined()
      expect(admittedSpaces(captured.query.space)).not.toContain(S2)
    })
  })
})
