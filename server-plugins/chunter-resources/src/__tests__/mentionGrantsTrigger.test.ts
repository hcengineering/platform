import { type MeasureContext, type Tx, type TxCreateDoc } from '@hcengineering/core'
import { jsonToMarkup, MarkupNodeType } from '@hcengineering/text-core'

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
  const actual = jest.requireActual('@hcengineering/core') as any

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

// Imported AFTER the mocks so the trigger picks up the mocked helpers.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ChunterTrigger } = require('../index')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const coreModule = require('@hcengineering/core')
const coreDefault = coreModule.default

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

function makeControl (): any {
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
        // NON-EMPTY -> skip the legacy init branch (index.ts:204) and provide
        // the grant-target dedup basis (existing-acc already a collaborator).
        return [{ collaborator: 'existing-acc' }]
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
      // targetDoc lookup (message.attachedTo)
      return [TARGET]
    }),
    ctx: {
      with: async (_name: string, _params: any, fn: any) => await fn({}),
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

describe('ChunterTrigger mention grants — grantsAccess filter', () => {
  test("a reference with grantsAccess='false' yields no Collaborator tx for that person", async () => {
    const ctx = {} as unknown as MeasureContext
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
