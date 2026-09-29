import { type Doc, type Tx, type TxCreateDoc } from '@hcengineering/core'

// Imported AFTER the mocks (jest.mock is hoisted by ts-jest, so even these
// top-level ESM imports see the mocked modules). Avoid `require()` so the file
// passes `tsc --noEmit` (the package's tsconfig ships @types/jest).
import { getCollaborators } from '../index'
import coreDefault from '@hcengineering/core'

// ------------------------------------------------------------------
// jest.mock for @hcengineering/core
//
// getCollaborators bails immediately unless getClassCollaborators(...) returns a
// mixin for the (parent) doc's class. That helper reads the model DB, which is
// empty in this unit harness, so we override it to return a truthy mixin whose
// `fields` drive the REAL getDocCollaborators over a single TypeAccountUuid
// attribute. Everything else (default export `core`, TxProcessor, ...) stays
// real so the REAL getAddCollaboratTxes builds genuine Collaborator txes.
//
// jest.requireActual('@hcengineering/core') cannot be spread ({...actual}) in
// ts-jest (eager getters trip a circular-dependency crash in the compiled lib);
// delegate through a Proxy and override ONLY the one helper.
// ------------------------------------------------------------------
jest.mock('@hcengineering/core', () => {
  const actual = jest.requireActual('@hcengineering/core')
  const mockGetClassCollaborators = jest.fn(() => ({ allFields: false, fields: ['user'] }))
  return new Proxy(actual, {
    get (target: any, prop: string) {
      if (prop === 'getClassCollaborators') return mockGetClassCollaborators
      return target[prop]
    }
  })
})

// server-contact pulls a heavy dependency graph; getValueCollaborators only
// touches it on Ref/PersonId paths, which the TypeAccountUuid fixture avoids.
jest.mock('@hcengineering/server-contact', () => ({
  getAccountBySocialId: jest.fn(async () => undefined),
  getEmployeesBySocialIds: jest.fn(async () => ({}))
}))

// ------------------------------------------------------------------
// Fixtures.
//
// PARENT is the doc loaded via tx.attachedTo/attachedToClass in the real caller
// (createCollaboratorNotifications). Its default collaborator resolves to
// 'parent-only-acc' via the TypeAccountUuid `user` field.
//
// CHILD_TX is the create-tx of the attached item (e.g. a comment). It carries a
// DIFFERENT default collaborator ('child-only-acc') and a DIFFERENT space; the
// bug seeded the parent's collaborators onto THIS record.
// ------------------------------------------------------------------
const PARENT: Doc & { user: string } = {
  _id: 'parent-doc' as any,
  _class: 'test:class:Parent' as any,
  space: 'parent-space' as any,
  user: 'parent-only-acc',
  modifiedOn: 0,
  modifiedBy: 'someone' as any
}

const CHILD_ID = 'child-item'
const CHILD_SPACE = 'child-space'
// The child's OWN default collaborator — deliberately distinct from the parent's.
// It must never surface here (getCollaborators seeds the parent).
const CHILD_OWN_ACC = 'child-only-acc'

// Typed `any` on purpose: the real caller passes a TxCUD<Doc>, but the create-tx
// of an attached item also carries `attributes` (TxCreateDoc), which we set so
// the fixture models a genuine child create-tx.
const CHILD_TX: any = {
  _id: 'tx-1',
  _class: coreDefault.class.TxCreateDoc,
  objectId: CHILD_ID,
  objectClass: 'test:class:Child',
  objectSpace: CHILD_SPACE,
  space: 'tx-space',
  modifiedOn: 0,
  modifiedBy: 'author',
  attachedTo: PARENT._id,
  attachedToClass: PARENT._class,
  attributes: { user: CHILD_OWN_ACC }
}

function makeControl (): any {
  const ctx: any = {
    with: async (_name: string, _params: any, fn: any) => fn(ctx),
    error: () => {},
    contextData: {}
  }
  return {
    hierarchy: {
      // getDocCollaborators -> getKeyCollaborators -> findAttribute; a
      // TypeAccountUuid attr makes getValueCollaborators return [value] directly.
      findAttribute: (_cls: string, field: string) =>
        field === 'user' ? { type: { _class: coreDefault.class.TypeAccountUuid } } : undefined
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
      // No pre-existing Collaborator rows for the parent -> the seed branch fires.
      if (_class === coreDefault.class.Collaborator) return []
      return []
    }),
    ctx
  }
}

function collaboratorSeeds (res: Tx[]): Array<TxCreateDoc<any>> {
  return res.filter(
    (t): t is TxCreateDoc<any> =>
      t._class === coreDefault.class.TxCreateDoc && (t as any).objectClass === coreDefault.class.Collaborator
  )
}

describe('getCollaborators — seed default collaborators onto the parent doc', () => {
  test('seeds the parent doc as target, never the attached child tx', async () => {
    const control = makeControl()
    const res: Tx[] = []

    const recipients = await getCollaborators(control.ctx, PARENT, control, CHILD_TX, res)

    // (5) The returned collaborator list is independent of the seed target and
    // remains identical before and after the fix.
    expect(recipients).toEqual(['parent-only-acc'])

    // (1) parent default ('parent-only-acc') differs from child default
    // ('child-only-acc'); (2) parent space differs from child space.
    expect(PARENT.user).not.toBe(CHILD_OWN_ACC)
    expect(PARENT.space).not.toBe(CHILD_SPACE)

    const seeds = collaboratorSeeds(res)
    expect(seeds).toHaveLength(1)
    const seed = seeds[0]

    // (3) The seed lands on the PARENT doc.
    expect(seed.attributes.attachedTo).toBe(PARENT._id)
    expect(seed.attributes.attachedToClass).toBe(PARENT._class)
    expect(seed.objectSpace).toBe(PARENT.space)
    expect(seed.attributes.collaborator).toBe('parent-only-acc')

    // (4) The parent-only collaborator is NOT attached to the child item.
    const onChild = seeds.filter((s) => s.attributes.attachedTo === CHILD_ID)
    expect(onChild).toHaveLength(0)
    expect(seeds.some((s) => s.objectSpace === CHILD_SPACE)).toBe(false)
  })
})
