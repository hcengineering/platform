import { type Tx, type TxCreateDoc } from '@hcengineering/core'
import { jsonToMarkup, MarkupNodeType } from '@hcengineering/text-core'

// Imported AFTER the mocks (jest.mock above is hoisted by ts-jest, so even
// these top-level ESM imports see the mocked module). Avoid `require()` so
// the file passes `tsc --noEmit` (the package's tsconfig only ships @types/jest).
import { ChunterTrigger } from '../index'
import coreDefault, { resolveMentionGrantTarget } from '@hcengineering/core'
import { getDocCollaborators } from '@hcengineering/server-notification-resources'

// ------------------------------------------------------------------
// jest.mock for @hcengineering/core
//
// jest.requireActual('@hcengineering/core') crashes in ts-jest via spread
// due to a circular-dependency in the compiled lib (import_component2
// undefined during getter evaluation when all properties are accessed
// eagerly). We work around this by requiring the actual module and only
// accessing specific known-safe properties instead of spreading.
// ------------------------------------------------------------------
jest.mock('@hcengineering/core', () => {
  // Load the real module but access only the specific properties we need.
  // DO NOT spread with {...actual}: that triggers all lazy getters eagerly,
  // hitting the circular-dep crash in import_component2.
  const actual = jest.requireActual('@hcengineering/core')

  // Build a proxy that delegates unknown property reads to the actual module.
  // This avoids the eager spread while still giving server-core etc. access
  // to toFindResult, TxProcessor, etc.
  const proxy = new Proxy(actual, {
    get (target: any, prop: string) {
      if (prop === 'getClassCollaborators') return mockGetClassCollaborators
      if (prop === 'resolveMentionGrantTarget') return mockResolveMentionGrantTarget
      return target[prop]
    }
  })

  const mockGetClassCollaborators = jest.fn(() => ({ provideSecurity: true, mentionsGrantAccess: true }))
  const mockResolveMentionGrantTarget = jest.fn(async (doc: any) => doc)

  return proxy
})

jest.mock('@hcengineering/server-contact', () => ({
  getAccountBySocialId: jest.fn(async () => 'author-acc'),
  getPerson: jest.fn(async () => undefined)
}))

// ------------------------------------------------------------------
// jest.mock for @hcengineering/server-notification-resources (F3 infra).
//
// Needed by the in-flight-dedup tests (B/C) which drive the seed path
// (currentCollaborators empty). getAddCollaboratTxes is implemented to
// attach Collaborator records to TARGET._id ('issue-1') — this SIMULATES a
// future world where the seed lands on the Issue itself (today it attaches
// to the message via tx.objectId). The real class ids are pulled from the
// actual core module so the emitted txes match coreDefault.class.* used by
// the assertions. Existing tests never hit the seed branch (their
// Collaborator findAll is non-empty), so these mocks are inert for them.
// ------------------------------------------------------------------
jest.mock('@hcengineering/server-notification-resources', () => {
  const actualCore = jest.requireActual('@hcengineering/core')
  const txCreateDocId = actualCore.default.class.TxCreateDoc
  const collaboratorId = actualCore.default.class.Collaborator
  return {
    getDocCollaborators: jest.fn(async () => [] as string[]),
    createCollaboratorNotifications: jest.fn(async () => []),
    getAddCollaboratTxes: jest.fn(
      (_objectId: any, _objectClass: any, _objectSpace: any, _control: any, collaborators: string[]) =>
        collaborators.map((c) => ({
          _class: txCreateDocId,
          objectClass: collaboratorId,
          objectSpace: 'space-1',
          attributes: {
            attachedTo: 'issue-1',
            attachedToClass: 'tracker:class:Issue',
            collaborator: c,
            collection: 'collaborators'
          }
        }))
    )
  }
})

function makeMarkup (...refs: Array<{ id: string, grantsAccess?: 'true' | 'false' }>): string {
  return jsonToMarkup({
    type: MarkupNodeType.doc,
    content: refs.map((r) => ({
      type: MarkupNodeType.reference,
      attrs: {
        id: r.id,
        label: r.id,
        objectclass: 'contact:class:Person',
        ...(r.grantsAccess !== undefined ? { grantsAccess: r.grantsAccess } : {})
      }
    }))
  })
}

const TARGET = { _id: 'issue-1', _class: 'tracker:class:Issue', space: 'space-1' }

function makeControl (opts: { collab?: (query: any) => any[] } = {}): any {
  return {
    hierarchy: {
      // ChunterTrigger dispatches on isDerived(tx.objectClass, ChatMessage)
      // FIRST (index.ts:360) — without the ChatMessage branch OnChatMessageCreated
      // never runs. Mentioned refs are Persons; ThreadMessage/Channel stay false.
      isDerived: (cls: string, base: string) =>
        (base === 'chunter:class:ChatMessage' && cls === 'chunter:class:ChatMessage') ||
        (base === 'contact:class:Person' && cls === 'contact:class:Person')
    },
    modelDb: {},
    txFactory: {
      createTxCreateDoc: (_class: string, space: string, attributes: any) => ({
        _class: coreDefault.class.TxCreateDoc,
        objectClass: _class,
        objectSpace: space,
        attributes
      })
    },
    findAll: jest.fn(async (_ctx: any, _class: string, query: any) => {
      if (_class === coreDefault.class.Collaborator) {
        // NON-EMPTY (default) -> skip the legacy init branch (index.ts:204) and
        // provide the grant-target dedup basis (existing-acc already a collab).
        // Tests that need the seed path (empty issue) pass an `opts.collab`
        // override, query-aware on `query.attachedTo`.
        return opts.collab != null ? opts.collab(query) : [{ collaborator: 'existing-acc' }]
      }
      if (_class === coreDefault.class.ClassCollaborators) {
        return [{ provideSecurity: true }]
      }
      if (typeof _class === 'string' && _class.includes('Employee')) {
        // Query-based: return an Employee for EVERY requested id. If the mock
        // hardcoded only p1, the test would pass even WITHOUT the grantsAccess
        // filter (p2 never returned) — a false positive. Returning all requested
        // ids means a missing filter WOULD grant p2, so the test is red before
        // Step 3 and green after.
        const ids: string[] = query?._id?.$in ?? []
        return ids.map((id: string) => ({ _id: id, personUuid: `${id}-acc` }))
      }
      if (_class === 'chunter:class:ChatMessage') {
        // OnChatMessageUpdated loads the current stored message by _id before
        // applying the update operations. Return a ChatMessage shape with the
        // OLD (no-mention) body; the update tx supplies the new text.
        return [
          {
            _id: 'msg-1',
            _class: 'chunter:class:ChatMessage',
            space: 'space-1',
            attachedTo: TARGET._id,
            attachedToClass: TARGET._class,
            collection: 'comments',
            message: makeMarkup(),
            modifiedBy: 'social-author',
            modifiedOn: 1
          }
        ]
      }
      // targetDoc lookup (message.attachedTo)
      return [TARGET]
    }),
    ctx: {
      with: async (_name: string, _params: any, fn: any) => fn({}),
      contextData: {}
    }
  }
}

function makeCreateTx (markup: string): any {
  return {
    _class: coreDefault.class.TxCreateDoc,
    objectClass: 'chunter:class:ChatMessage',
    objectId: 'msg-1',
    objectSpace: 'space-1',
    modifiedBy: 'social-author',
    attributes: {
      attachedTo: TARGET._id,
      attachedToClass: TARGET._class,
      message: markup,
      collection: 'comments'
    }
  }
}

function makeUpdateTx (operations: any, modifiedBy = 'social-editor'): any {
  return {
    _class: coreDefault.class.TxUpdateDoc,
    objectClass: 'chunter:class:ChatMessage',
    objectId: 'msg-1',
    objectSpace: 'space-1',
    modifiedBy,
    modifiedOn: 2,
    operations
  }
}

function collaboratorGrants (res: Tx[]): string[] {
  return res
    .filter(
      (t): t is TxCreateDoc<any> =>
        t._class === coreDefault.class.TxCreateDoc && (t as any).objectClass === coreDefault.class.Collaborator
    )
    .map((t) => (t as any).attributes.collaborator)
}

describe('ChunterTrigger mention grants — grantsAccess filter', () => {
  test("a reference with grantsAccess='false' yields no Collaborator tx for that person", async () => {
    const control = makeControl()
    const tx = makeCreateTx(makeMarkup({ id: 'p1' }, { id: 'p2', grantsAccess: 'false' }))

    const res: Tx[] = await ChunterTrigger([tx], control)

    const granted = res
      .filter(
        (t): t is TxCreateDoc<any> =>
          t._class === coreDefault.class.TxCreateDoc && (t as any).objectClass === coreDefault.class.Collaborator
      )
      .map((t) => (t as any).attributes.collaborator)

    expect(granted).toContain('p1-acc') // p1 granted (no deny flag)
    expect(granted).not.toContain('p2-acc') // p2 denied via grantsAccess='false'

    // Stronger: the denied person must be filtered BEFORE the Employee query,
    // so the query's id list must be exactly ['p1'] (not ['p1','p2']).
    const employeeCall = control.findAll.mock.calls.find(
      (c: any[]) => typeof c[1] === 'string' && c[1].includes('Employee')
    )
    expect(employeeCall?.[2]?._id?.$in).toEqual(['p1'])
  })
})

describe('ChunterTrigger mention grants — V3d add-only re-grant on edit', () => {
  test('a newly-added mention on edit grants the mentioned employee', async () => {
    const control = makeControl()
    const tx = makeUpdateTx({ message: makeMarkup({ id: 'p3' }) })

    const res: Tx[] = await ChunterTrigger([tx], control)

    expect(collaboratorGrants(res)).toContain('p3-acc')
  })

  test('a denied mention on edit grants nothing (V3c filter still applies)', async () => {
    const control = makeControl()
    const tx = makeUpdateTx({ message: makeMarkup({ id: 'p3', grantsAccess: 'false' }) })

    const res: Tx[] = await ChunterTrigger([tx], control)

    expect(collaboratorGrants(res)).not.toContain('p3-acc')
  })

  test('an already-granted collaborator is deduped — add-only no-op', async () => {
    const control = makeControl()
    // 'existing' resolves to personUuid 'existing-acc', which the grant target
    // already lists (findAll Collaborator returns existing-acc) -> no new tx.
    const tx = makeUpdateTx({ message: makeMarkup({ id: 'existing' }) })

    const res: Tx[] = await ChunterTrigger([tx], control)

    expect(collaboratorGrants(res)).not.toContain('existing-acc')
    expect(collaboratorGrants(res)).toHaveLength(0)
  })

  test('a System-authored edit grants nothing (stale modifiedBy guard — uses edit actor)', async () => {
    const control = makeControl()
    // updateDoc2Doc sets message.modifiedBy = tx.modifiedBy = System, so the
    // applyMentionGrants System guard fires. If the handler used the stored
    // doc's (non-System) author instead, this would wrongly grant.
    const tx = makeUpdateTx({ message: makeMarkup({ id: 'p3' }) }, coreDefault.account.System)

    const res: Tx[] = await ChunterTrigger([tx], control)

    expect(collaboratorGrants(res)).toHaveLength(0)
  })

  test('a non-message update (no operations.message) is a no-op', async () => {
    const control = makeControl()
    const tx = makeUpdateTx({ reactions: 1 })

    const res: Tx[] = await ChunterTrigger([tx], control)

    expect(collaboratorGrants(res)).toHaveLength(0)
  })
})

describe('ChunterTrigger mention grants — in-flight & self-mention dedup', () => {
  test('Test A: self-mention yields exactly ONE Collaborator tx for the author', async () => {
    // real duplicate on today's code: the author @-mentions themselves, so the
    // author's uuid appears TWICE in collaboratorsFromMessage — once as the
    // resolved Employee (id 'author' -> personUuid 'author-acc') and once as the
    // `account` (getAccountBySocialId -> 'author-acc'). Before the in-loop dedup
    // fix the grant branch pushes TWO identical TxCreateDoc<Collaborator>.
    const control = makeControl()
    const tx = makeCreateTx(makeMarkup({ id: 'author' }))

    const res: Tx[] = await ChunterTrigger([tx], control)

    const authorGrants = collaboratorGrants(res).filter((c) => c === 'author-acc')
    expect(authorGrants).toHaveLength(1) // before fix: 2
  })

  test('Test B: in-flight seed tx dedups the grant on the same target (future-fixed seed path)', async () => {
    // FUTURE regression guard — this simulates a world where the seed lands on
    // the Issue itself (getAddCollaboratTxes mock attaches to TARGET._id). It
    // does NOT reflect today's runtime (today the seed attaches to the message).
    // Empty issue + mention of an auto-collaborator: the seed creates a
    // Collaborator(p5-acc, attachedTo issue-1) AND the grant loop would create a
    // second Collaborator(p5-acc, attachedTo issue-1). The fix folds the
    // in-flight seed tx into the dedup basis -> exactly one record survives.
    ;(getDocCollaborators as jest.Mock).mockResolvedValueOnce(['p5-acc'])
    // query-aware: empty for issue-1 (trigger seed + empty grant basis).
    const control = makeControl({ collab: () => [] })
    const tx = makeCreateTx(makeMarkup({ id: 'p5' }))

    const res: Tx[] = await ChunterTrigger([tx], control)

    const p5Records = collaboratorGrants(res).filter((c) => c === 'p5-acc')
    expect(p5Records).toHaveLength(1) // before fix: 2 (seed + grant)
  })

  test('Test C: seed tx on the child target does NOT dedup the grant on the ancestor', async () => {
    // Thread delimitation — protects against the naive fix (dedup against ALL
    // in-flight collaborator txes regardless of attachedTo). resolveMentionGrantTarget
    // returns an ANCESTOR (epic-1) != targetDoc (issue-1). The seed attaches
    // Collaborator(p9-acc) to the child issue-1; the grant must still be written
    // for p9-acc on the ancestor epic-1 because the dedup basis is SCOPED to
    // grantTarget._id.
    const ANCESTOR = { _id: 'epic-1', _class: 'tracker:class:Issue', space: 'space-1' }
    ;(resolveMentionGrantTarget as jest.Mock).mockImplementationOnce(async () => ANCESTOR)
    ;(getDocCollaborators as jest.Mock).mockResolvedValueOnce(['p9-acc'])
    const control = makeControl({ collab: () => [] })
    const tx = makeCreateTx(makeMarkup({ id: 'p9' }))

    const res: Tx[] = await ChunterTrigger([tx], control)

    // Grant for p9-acc must exist on the ancestor epic-1 (not swallowed by the
    // seed tx which is scoped to the child issue-1).
    const grantOnAncestor = res.filter(
      (t: any) =>
        t._class === coreDefault.class.TxCreateDoc &&
        t.objectClass === coreDefault.class.Collaborator &&
        t.attributes.attachedTo === 'epic-1' &&
        t.attributes.collaborator === 'p9-acc'
    )
    expect(grantOnAncestor).toHaveLength(1)
  })
})
