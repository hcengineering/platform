import { type Tx, type TxCreateDoc } from '@hcengineering/core'
import { jsonToMarkup, MarkupNodeType } from '@hcengineering/text-core'

// Imported AFTER the mocks (jest.mock above is hoisted by ts-jest, so even
// these top-level ESM imports see the mocked module). Avoid `require()` so
// the file passes `tsc --noEmit` (the package's tsconfig only ships @types/jest).
import { ChunterTrigger, OnChatMessageRemoved } from '../index'
import coreDefault from '@hcengineering/core'

// ------------------------------------------------------------------
// jest.mock for @hcengineering/core
//
// jest.requireActual('@hcengineering/core') crashes in ts-jest via spread
// due to a circular-dependency in the compiled lib (import_component2
// undefined during getter evaluation when all properties are accessed
// eagerly). We work around this by requiring the actual module and only
// accessing specific known-safe properties instead of spreading.
//
// P5: resolveMentionGrantTarget is driven by a globalThis flag so a single
// test can exercise the notification-only (non-grant-target) path.
// ------------------------------------------------------------------
jest.mock('@hcengineering/core', () => {
  const actual = jest.requireActual('@hcengineering/core')

  const mockGetClassCollaborators = jest.fn(() => ({ provideSecurity: true, mentionsGrantAccess: true }))
  const mockResolveMentionGrantTarget = jest.fn(async (doc: any) =>
    (globalThis as any).__noGrantTarget === true ? null : doc
  )

  const proxy = new Proxy(actual, {
    get (target: any, prop: string) {
      if (prop === 'getClassCollaborators') return mockGetClassCollaborators
      if (prop === 'resolveMentionGrantTarget') return mockResolveMentionGrantTarget
      return target[prop]
    }
  })

  return proxy
})

jest.mock('@hcengineering/server-contact', () => ({
  getAccountBySocialId: jest.fn(async () => 'author-acc'),
  getPerson: jest.fn(async () => undefined)
}))

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

interface ControlOpts {
  spaceMembers?: string[]
  // Existing grantedVia:'mention' records for THIS message (msg-1).
  mentionRecords?: Array<{ _id: string, collaborator: string, grantedByMessage?: string }>
  // All collaborators on the grant target (structural / any provenance).
  targetCollaborators?: Array<{ _id: string, collaborator: string, grantedVia?: string, grantedByMessage?: string }>
  classCollabProvideSecurity?: boolean
}

function makeControl (opts: ControlOpts = {}): any {
  const spaceMembers = opts.spaceMembers ?? ['author-acc']
  const mentionRecords = opts.mentionRecords ?? []
  const targetCollaborators = opts.targetCollaborators ?? [
    { _id: 'col-existing', collaborator: 'existing-acc' } // structural, no provenance
  ]
  const classCollabProvideSecurity = opts.classCollabProvideSecurity ?? true

  return {
    hierarchy: {
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
      }),
      createTxRemoveDoc: (_class: string, space: string, objectId: string) => ({
        _class: coreDefault.class.TxRemoveDoc,
        objectClass: _class,
        objectSpace: space,
        objectId
      })
    },
    findAll: jest.fn(async (_ctx: any, _class: string, query: any) => {
      if (_class === coreDefault.class.Collaborator) {
        if (query?.grantedVia === 'mention') {
          // Message-scoped mention records (revoke + dedup basis).
          return mentionRecords.map((r) => ({
            _id: r._id,
            _class: coreDefault.class.Collaborator,
            space: 'space-1',
            collaborator: r.collaborator,
            grantedVia: 'mention',
            grantedByMessage: r.grantedByMessage ?? 'msg-1'
          }))
        }
        // Full collaborator list on the target (structural + any provenance).
        return targetCollaborators.map((c) => ({
          _id: c._id,
          _class: coreDefault.class.Collaborator,
          space: 'space-1',
          collaborator: c.collaborator,
          grantedVia: c.grantedVia,
          grantedByMessage: c.grantedByMessage
        }))
      }
      if (_class === coreDefault.class.ClassCollaborators) {
        return [{ provideSecurity: classCollabProvideSecurity }]
      }
      if (_class === coreDefault.class.Space) {
        return [{ _id: 'space-1', members: spaceMembers }]
      }
      if (typeof _class === 'string' && _class.includes('InboxNotification')) {
        return []
      }
      if (typeof _class === 'string' && _class.includes('Employee')) {
        const ids: string[] = query?._id?.$in ?? []
        return ids.map((id: string) => ({ _id: id, personUuid: `${id}-acc` }))
      }
      if (_class === 'chunter:class:ChatMessage') {
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

function makeRemoveTx (): any {
  return {
    _class: coreDefault.class.TxRemoveDoc,
    objectClass: 'chunter:class:ChatMessage',
    objectId: 'msg-1',
    objectSpace: 'space-1'
  }
}

// All created Collaborator records (attributes).
function collaboratorCreates (res: Tx[]): any[] {
  return res
    .filter(
      (t): t is TxCreateDoc<any> =>
        t._class === coreDefault.class.TxCreateDoc && (t as any).objectClass === coreDefault.class.Collaborator
    )
    .map((t) => (t as any).attributes)
}

// Only mention-provenance grant creates.
function mentionGrantCreates (res: Tx[]): any[] {
  return collaboratorCreates(res).filter((a) => a.grantedVia === 'mention')
}

// Collaborator removals -> the removed record _id.
function collaboratorRemovals (res: Tx[]): string[] {
  return res
    .filter(
      (t: any) => t._class === coreDefault.class.TxRemoveDoc && t.objectClass === coreDefault.class.Collaborator
    )
    .map((t: any) => t.objectId)
}

afterEach(() => {
  delete (globalThis as any).__noGrantTarget
})

// ------------------------------------------------------------------
// 5.1 — provenance + default level
// ------------------------------------------------------------------
describe('P5.1 mention grants carry provenance + default level', () => {
  test('a consented mention grant carries grantedVia=mention, grantedBy, grantedByMessage, level=read', async () => {
    const control = makeControl()
    const tx = makeCreateTx(makeMarkup({ id: 'p1', grantsAccess: 'true' }))

    const res = await ChunterTrigger([tx], control)
    const grants = mentionGrantCreates(res)

    expect(grants).toHaveLength(1)
    expect(grants[0]).toMatchObject({
      collaborator: 'p1-acc',
      grantedVia: 'mention',
      grantedBy: 'author-acc',
      grantedByMessage: 'msg-1',
      level: 'read'
    })
  })

  test('double provenance: a person with a structural record still gets a mention record', async () => {
    // 'existing-acc' is already a structural collaborator on the target; a
    // consented mention of that person must still add a mention-read record
    // (dedup is per (collaborator, mention, message), NOT global).
    const control = makeControl()
    const tx = makeCreateTx(makeMarkup({ id: 'existing', grantsAccess: 'true' }))

    const res = await ChunterTrigger([tx], control)
    const grants = mentionGrantCreates(res)

    expect(grants.map((g) => g.collaborator)).toContain('existing-acc')
  })
})

// ------------------------------------------------------------------
// 5.2 — fail-closed consent + author gate + notification separation
// ------------------------------------------------------------------
describe('P5.2 fail-closed consent', () => {
  test('a mention WITHOUT grantsAccess grants nothing (fail-closed)', async () => {
    const control = makeControl()
    const tx = makeCreateTx(makeMarkup({ id: 'p1' })) // no grantsAccess flag

    const res = await ChunterTrigger([tx], control)

    expect(mentionGrantCreates(res)).toHaveLength(0)
  })

  test("grantsAccess='false' grants nothing; grantsAccess='true' grants; denied filtered before Employee query", async () => {
    const control = makeControl()
    const tx = makeCreateTx(makeMarkup({ id: 'p1', grantsAccess: 'true' }, { id: 'p2', grantsAccess: 'false' }))

    const res = await ChunterTrigger([tx], control)
    const granted = mentionGrantCreates(res).map((g) => g.collaborator)

    expect(granted).toContain('p1-acc')
    expect(granted).not.toContain('p2-acc')

    // Employee query is driven by the notify list (!== 'false'); p2 is excluded.
    const employeeCall = control.findAll.mock.calls.find(
      (c: any[]) => typeof c[1] === 'string' && c[1].includes('Employee')
    )
    expect(employeeCall?.[2]?._id?.$in).toEqual(['p1'])
  })

  test('author who is NOT a space member cannot grant (author-membership gate)', async () => {
    const control = makeControl({ spaceMembers: [] }) // author-acc not a member
    const tx = makeCreateTx(makeMarkup({ id: 'p1', grantsAccess: 'true' }))

    const res = await ChunterTrigger([tx], control)

    expect(mentionGrantCreates(res)).toHaveLength(0)
  })

  test('notification fan-out on a NON-grant target still creates collaborators without provenance', async () => {
    ;(globalThis as any).__noGrantTarget = true
    const control = makeControl({
      classCollabProvideSecurity: false,
      targetCollaborators: [{ _id: 'col-x', collaborator: 'other-acc' }]
    })
    const tx = makeCreateTx(makeMarkup({ id: 'p1' })) // no grant flag -> notify only

    const res = await ChunterTrigger([tx], control)
    const creates = collaboratorCreates(res)

    // p1 (and the author) are added for notification, and NONE carry a grant.
    expect(creates.map((c) => c.collaborator)).toContain('p1-acc')
    expect(creates.every((c) => c.grantedVia === undefined)).toBe(true)
  })
})

// ------------------------------------------------------------------
// 5.3 — reconcile on edit + revoke on delete
// ------------------------------------------------------------------
describe('P5.3 reconcile on edit', () => {
  test('a newly-consented mention on edit grants the mentioned employee', async () => {
    const control = makeControl()
    const tx = makeUpdateTx({ message: makeMarkup({ id: 'p3', grantsAccess: 'true' }) })

    const res = await ChunterTrigger([tx], control)

    expect(mentionGrantCreates(res).map((g) => g.collaborator)).toContain('p3-acc')
  })

  test('an unconsented mention on edit grants nothing (fail-closed)', async () => {
    const control = makeControl()
    const tx = makeUpdateTx({ message: makeMarkup({ id: 'p3' }) })

    const res = await ChunterTrigger([tx], control)

    expect(mentionGrantCreates(res)).toHaveLength(0)
  })

  test('an already-granted mention is deduped — no new create, no remove', async () => {
    const control = makeControl({
      mentionRecords: [{ _id: 'col-p3', collaborator: 'p3-acc' }]
    })
    const tx = makeUpdateTx({ message: makeMarkup({ id: 'p3', grantsAccess: 'true' }) })

    const res = await ChunterTrigger([tx], control)

    expect(mentionGrantCreates(res)).toHaveLength(0)
    expect(collaboratorRemovals(res)).toHaveLength(0)
  })

  test('removing a mention on edit revokes ONLY that message\'s mention record', async () => {
    // p3 was granted by this message; the edit drops the mention -> its record
    // is removed. A record from ANOTHER message (col-other) is out of scope.
    const control = makeControl({
      mentionRecords: [{ _id: 'col-p3', collaborator: 'p3-acc' }]
    })
    const tx = makeUpdateTx({ message: makeMarkup() }) // no mentions left

    const res = await ChunterTrigger([tx], control)

    expect(collaboratorRemovals(res)).toEqual(['col-p3'])
  })

  test('edit keeps one mention, drops another -> only the dropped record is removed', async () => {
    const control = makeControl({
      mentionRecords: [
        { _id: 'col-p3', collaborator: 'p3-acc' },
        { _id: 'col-p4', collaborator: 'p4-acc' }
      ]
    })
    const tx = makeUpdateTx({ message: makeMarkup({ id: 'p3', grantsAccess: 'true' }) })

    const res = await ChunterTrigger([tx], control)

    expect(mentionGrantCreates(res)).toHaveLength(0) // p3 already granted
    expect(collaboratorRemovals(res)).toEqual(['col-p4'])
  })

  test('a System-authored edit reconciles nothing (System guard)', async () => {
    const control = makeControl({ mentionRecords: [{ _id: 'col-p3', collaborator: 'p3-acc' }] })
    const tx = makeUpdateTx({ message: makeMarkup() }, coreDefault.account.System)

    const res = await ChunterTrigger([tx], control)

    expect(collaboratorCreates(res)).toHaveLength(0)
    expect(collaboratorRemovals(res)).toHaveLength(0)
  })

  test('a non-message update (no operations.message) is a no-op', async () => {
    const control = makeControl({ mentionRecords: [{ _id: 'col-p3', collaborator: 'p3-acc' }] })
    const tx = makeUpdateTx({ reactions: 1 })

    const res = await ChunterTrigger([tx], control)

    expect(collaboratorCreates(res)).toHaveLength(0)
    expect(collaboratorRemovals(res)).toHaveLength(0)
  })
})

describe('P5.3 revoke on message delete', () => {
  test('deleting a message revokes exactly its mention grants', async () => {
    const control = makeControl({ mentionRecords: [{ _id: 'col-p3', collaborator: 'p3-acc' }] })

    const res = await OnChatMessageRemoved([makeRemoveTx()], control)

    expect(collaboratorRemovals(res)).toEqual(['col-p3'])
    // The Collaborator query is scoped to this message's mention provenance.
    const collabCall = control.findAll.mock.calls.find(
      (c: any[]) => c[1] === coreDefault.class.Collaborator && c[2]?.grantedVia === 'mention'
    )
    expect(collabCall?.[2]).toMatchObject({ grantedVia: 'mention', grantedByMessage: 'msg-1' })
  })

  test('deleting a message with no mention grants removes no collaborators', async () => {
    const control = makeControl({ mentionRecords: [] })

    const res = await OnChatMessageRemoved([makeRemoveTx()], control)

    expect(collaboratorRemovals(res)).toHaveLength(0)
  })
})
