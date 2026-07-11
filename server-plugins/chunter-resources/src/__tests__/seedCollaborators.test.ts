import { type Tx, type TxCreateDoc } from '@hcengineering/core'
import { jsonToMarkup, MarkupNodeType } from '@hcengineering/text-core'

// Imported AFTER the mocks (jest.mock is hoisted by ts-jest, so even these
// top-level ESM imports see the mocked modules). Avoid `require()` so the file
// passes `tsc --noEmit` (the package's tsconfig ships @types/jest).
import { ChunterTrigger } from '../index'
import coreDefault from '@hcengineering/core'
import chunter from '@hcengineering/chunter'

// ------------------------------------------------------------------
// jest.mock for @hcengineering/core
//
// OnChatMessageCreated only reaches the seed branch when
// getClassCollaborators(...) is defined for both the message's attachedToClass
// and the targetDoc's class. That helper reads the model DB, which is empty in
// this unit harness, so we override it to return a truthy mixin.
//
// jest.requireActual('@hcengineering/core') cannot be spread ({...actual}) in
// ts-jest: the eager getter evaluation trips a circular-dependency crash in the
// compiled lib. We delegate through a Proxy and override ONLY the one helper.
// Everything else (default export `core`, TxProcessor, notEmpty, ...) stays real
// so getAddCollaboratTxes builds genuine core.class.Collaborator txes.
// ------------------------------------------------------------------
jest.mock('@hcengineering/core', () => {
  const actual = jest.requireActual('@hcengineering/core')
  const mockGetClassCollaborators = jest.fn(() => ({ provideSecurity: true }))
  return new Proxy(actual, {
    get (target: any, prop: string) {
      if (prop === 'getClassCollaborators') return mockGetClassCollaborators
      return target[prop]
    }
  })
})

jest.mock('@hcengineering/server-contact', () => ({
  getAccountBySocialId: jest.fn(async () => undefined),
  getPerson: jest.fn(async () => undefined)
}))

// ------------------------------------------------------------------
// jest.mock for @hcengineering/server-notification-resources
//
// CRITICAL: getAddCollaboratTxes is NOT mocked — it runs REAL (requireActual),
// so the test exercises the actual wiring of attachedTo/attachedToClass/space
// that the fix corrected. We only stub the two collaborator-source helpers:
//   - getDocCollaborators -> a deterministic seed set ['default-acc']
//   - createCollaboratorNotifications -> no-op (imported by index.ts)
// ------------------------------------------------------------------
jest.mock('@hcengineering/server-notification-resources', () => {
  const actual = jest.requireActual('@hcengineering/server-notification-resources')
  return {
    ...actual,
    getDocCollaborators: jest.fn(async () => ['default-acc']),
    createCollaboratorNotifications: jest.fn(async () => [])
  }
})

function emptyMarkup (): string {
  return jsonToMarkup({ type: MarkupNodeType.doc, content: [] })
}

// The target doc the ChatMessage is attached to. Its class is opaque here
// (getClassCollaborators is mocked truthy regardless), it only needs to differ
// from the message so a wrong-target seed is observable. Its space differs from
// the message space too, so the objectSpace assertion is also red-before/green-after.
const TARGET = { _id: 'issue-1', _class: 'tracker:class:Issue', space: 'target-space' }

function makeControl (): any {
  const ctx: any = {
    with: async (_name: string, _params: any, fn: any) => fn(ctx),
    contextData: {}
  }
  return {
    hierarchy: {
      // ChunterTrigger dispatches on isDerived(tx.objectClass, ChatMessage).
      // ThreadMessage/Channel checks must stay false; a plain equality suffices
      // for this harness (ChatMessage===ChatMessage true, everything else false).
      isDerived: (cls: string, base: string) => cls === base
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
    findAll: jest.fn(async (_ctx: any, _class: string, _query: any) => {
      if (_class === coreDefault.class.Collaborator) {
        // EMPTY -> currentCollaborators is empty -> the seed branch fires.
        return []
      }
      if (_class === coreDefault.class.ClassCollaborators) {
        // provideSecurity true -> the mention grant loop is skipped, isolating
        // the seed tx as the only emitted Collaborator create.
        return [{ provideSecurity: true }]
      }
      // targetDoc lookup (message.attachedToClass, { _id: message.attachedTo }).
      return [TARGET]
    }),
    ctx
  }
}

function makeCreateTx (): any {
  return {
    _class: coreDefault.class.TxCreateDoc,
    objectClass: chunter.class.ChatMessage,
    objectId: 'msg-1', // <- the ChatMessage id; the bug seeded onto THIS
    objectSpace: 'message-space', // <- differs from TARGET.space
    modifiedBy: 'social-author',
    attributes: {
      attachedTo: TARGET._id,
      attachedToClass: TARGET._class,
      message: emptyMarkup(),
      collection: 'comments'
    }
  }
}

function seedTx (res: Tx[]): TxCreateDoc<any> | undefined {
  return res.find(
    (t): t is TxCreateDoc<any> =>
      t._class === coreDefault.class.TxCreateDoc &&
      (t as any).objectClass === coreDefault.class.Collaborator &&
      (t as any).attributes.collaborator === 'default-acc'
  )
}

describe('OnChatMessageCreated — seed default collaborators onto the target doc', () => {
  test('the seeded Collaborator is attached to the target doc, not the ChatMessage', async () => {
    const control = makeControl()
    const tx = makeCreateTx()

    const res: Tx[] = await ChunterTrigger([tx], control)

    const seed = seedTx(res)
    expect(seed).toBeDefined()

    // Red before the fix (getAddCollaboratTxes(tx.objectId, ...)): the seed would
    // land on the message -> attachedTo 'msg-1', attachedToClass ChatMessage,
    // objectSpace 'message-space'.
    // Green after the fix (getAddCollaboratTxes(targetDoc._id, ...)).
    expect(seed?.attributes.attachedTo).toBe(TARGET._id)
    expect(seed?.attributes.attachedToClass).toBe(TARGET._class)
    expect(seed?.objectSpace).toBe(TARGET.space)
  })

  test('exactly one seed Collaborator tx is emitted for the default collaborator', async () => {
    const control = makeControl()
    const tx = makeCreateTx()

    const res: Tx[] = await ChunterTrigger([tx], control)

    const seeds = res.filter(
      (t: any) =>
        t._class === coreDefault.class.TxCreateDoc &&
        t.objectClass === coreDefault.class.Collaborator &&
        t.attributes.collaborator === 'default-acc'
    )
    expect(seeds).toHaveLength(1)
  })
})
