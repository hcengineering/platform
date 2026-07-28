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

import core, { type Tx } from '@hcengineering/core'
import { OnAccessGroupChanged, OnGroupGrantChanged } from '../index'

interface Store {
  groups: any[]
  grants: any[]
  collaborators: any[]
}

function makeControl (store: Store): any {
  return {
    ctx: {},
    hierarchy: {
      isDerived: (cls: string, base: string) => cls === base
    },
    txFactory: {
      createTxCreateDoc: (_class: string, space: string, attributes: any) => ({
        _class: core.class.TxCreateDoc,
        objectClass: _class,
        objectSpace: space,
        objectId: `new-${String(attributes.collaborator)}`,
        attributes
      }),
      createTxRemoveDoc: (_class: string, space: string, objectId: string) => ({
        _class: core.class.TxRemoveDoc,
        objectClass: _class,
        objectSpace: space,
        objectId
      })
    },
    findAll: jest.fn(async (_ctx: any, _class: string, query: any) => {
      if (_class === core.class.AccessGroup) {
        return store.groups.filter((g) => query?._id === undefined || g._id === query._id)
      }
      if (_class === core.class.GroupGrant) {
        return store.grants.filter(
          (g) =>
            (query?._id === undefined || g._id === query._id) && (query?.group === undefined || g.group === query.group)
        )
      }
      if (_class === core.class.Collaborator) {
        return store.collaborators.filter(
          (c) =>
            (query?.attachedTo === undefined || c.attachedTo === query.attachedTo) &&
            (query?.grantedVia === undefined || c.grantedVia === query.grantedVia) &&
            (query?.grantedByGroup === undefined || c.grantedByGroup === query.grantedByGroup)
        )
      }
      return []
    })
  }
}

function grant (over: any): any {
  return {
    _id: 'grant-1',
    _class: core.class.GroupGrant,
    space: 'space-1',
    attachedTo: 'issue-1',
    attachedToClass: 'tracker:class:Issue',
    collection: 'groupGrants',
    group: 'group-1',
    grantedBy: 'granter',
    level: 'read',
    ...over
  }
}

function collab (over: any): any {
  return {
    _id: `collab-${String(over.collaborator)}`,
    _class: core.class.Collaborator,
    space: 'space-1',
    attachedTo: 'issue-1',
    attachedToClass: 'tracker:class:Issue',
    collection: 'collaborators',
    grantedVia: 'group',
    grantedByGroup: 'grant-1',
    ...over
  }
}

function makeGrantCreateTx (g: any): any {
  return {
    _class: core.class.TxCreateDoc,
    objectClass: core.class.GroupGrant,
    objectId: g._id,
    objectSpace: g.space,
    attachedTo: g.attachedTo,
    attachedToClass: g.attachedToClass,
    collection: 'groupGrants',
    modifiedBy: 'sys',
    modifiedOn: 1,
    attributes: { group: g.group, grantedBy: g.grantedBy, level: g.level }
  }
}

function createdCollabs (res: Tx[]): Array<{ collaborator: string, level: string }> {
  return res
    .filter((t) => t._class === core.class.TxCreateDoc && (t as any).objectClass === core.class.Collaborator)
    .map((t) => ({ collaborator: (t as any).attributes.collaborator, level: (t as any).attributes.level }))
}

function removedIds (res: Tx[]): string[] {
  return res
    .filter((t) => t._class === core.class.TxRemoveDoc && (t as any).objectClass === core.class.Collaborator)
    .map((t) => (t as any).objectId)
}

describe('OnGroupGrantChanged', () => {
  it('GroupGrant create materializes one group-collaborator per member at the grant level', async () => {
    const store: Store = {
      groups: [{ _id: 'group-1', members: ['a', 'b'] }],
      grants: [],
      collaborators: []
    }
    const control = makeControl(store)
    const res = await OnGroupGrantChanged([makeGrantCreateTx(grant({ level: 'write' }))], control)
    const created = createdCollabs(res)
    expect(created).toEqual(
      expect.arrayContaining([
        { collaborator: 'a', level: 'write' },
        { collaborator: 'b', level: 'write' }
      ])
    )
    expect(created).toHaveLength(2)
    expect(removedIds(res)).toEqual([])
  })

  it('changing GroupGrant.level re-materializes members at the new level (remove old + create new)', async () => {
    const store: Store = {
      groups: [{ _id: 'group-1', members: ['a'] }],
      grants: [grant({ level: 'admin' })],
      collaborators: [collab({ collaborator: 'a', level: 'read' })]
    }
    const control = makeControl(store)
    const upd: any = {
      _class: core.class.TxUpdateDoc,
      objectClass: core.class.GroupGrant,
      objectId: 'grant-1',
      objectSpace: 'space-1',
      operations: { level: 'admin' }
    }
    const res = await OnGroupGrantChanged([upd], control)
    expect(removedIds(res)).toEqual(['collab-a'])
    expect(createdCollabs(res)).toEqual([{ collaborator: 'a', level: 'admin' }])
  })

  it('GroupGrant remove tears down exactly its grantedByGroup records', async () => {
    const store: Store = {
      groups: [],
      grants: [],
      collaborators: [
        collab({ collaborator: 'a' }),
        collab({ collaborator: 'b' }),
        // a DIFFERENT grant's record — must NOT be torn down
        collab({ collaborator: 'c', _id: 'collab-c', grantedByGroup: 'grant-OTHER' })
      ]
    }
    const control = makeControl(store)
    const rm: any = {
      _class: core.class.TxRemoveDoc,
      objectClass: core.class.GroupGrant,
      objectId: 'grant-1',
      objectSpace: 'space-1'
    }
    const res = await OnGroupGrantChanged([rm], control)
    expect(removedIds(res).sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))).toEqual(['collab-a', 'collab-b'])
    expect(removedIds(res)).not.toContain('collab-c')
  })

  it('member in two granted groups keeps access until the last grant is removed', async () => {
    // Removing grant-1 must not touch grant-2's record for the same person.
    const store: Store = {
      groups: [],
      grants: [],
      collaborators: [
        collab({ collaborator: 'a', _id: 'collab-a-g1', grantedByGroup: 'grant-1' }),
        collab({ collaborator: 'a', _id: 'collab-a-g2', grantedByGroup: 'grant-2' })
      ]
    }
    const control = makeControl(store)
    const rm: any = {
      _class: core.class.TxRemoveDoc,
      objectClass: core.class.GroupGrant,
      objectId: 'grant-1',
      objectSpace: 'space-1'
    }
    const res = await OnGroupGrantChanged([rm], control)
    expect(removedIds(res)).toEqual(['collab-a-g1'])
    expect(removedIds(res)).not.toContain('collab-a-g2')
  })
})

describe('OnAccessGroupChanged', () => {
  it('adding a member to the group adds collaborators on every granted doc', async () => {
    const store: Store = {
      groups: [{ _id: 'group-1', members: ['a', 'b'] }],
      grants: [grant({ _id: 'grant-1', attachedTo: 'issue-1' }), grant({ _id: 'grant-2', attachedTo: 'issue-2' })],
      // only 'a' materialized so far on both docs
      collaborators: [
        collab({ collaborator: 'a', _id: 'c1', grantedByGroup: 'grant-1', attachedTo: 'issue-1' }),
        collab({ collaborator: 'a', _id: 'c2', grantedByGroup: 'grant-2', attachedTo: 'issue-2' })
      ]
    }
    const control = makeControl(store)
    const upd: any = {
      _class: core.class.TxUpdateDoc,
      objectClass: core.class.AccessGroup,
      objectId: 'group-1',
      objectSpace: 'space-1',
      operations: { $push: { members: 'b' } }
    }
    const res = await OnAccessGroupChanged([upd], control)
    const created = createdCollabs(res)
    expect(created.filter((c) => c.collaborator === 'b')).toHaveLength(2) // b added on both docs
    expect(created.every((c) => c.collaborator === 'b')).toBe(true) // 'a' already present, untouched
  })

  it('removing a member removes ONLY its group-provenance records (manual/mention untouched)', async () => {
    const store: Store = {
      groups: [{ _id: 'group-1', members: ['a'] }], // 'b' removed
      grants: [grant({ _id: 'grant-1' })],
      collaborators: [
        collab({ collaborator: 'a', _id: 'g-a' }),
        collab({ collaborator: 'b', _id: 'g-b' }),
        // manual grant for b on the same doc — different provenance, must survive
        { ...collab({ collaborator: 'b', _id: 'm-b' }), grantedVia: 'manual', grantedByGroup: undefined }
      ]
    }
    const control = makeControl(store)
    const upd: any = {
      _class: core.class.TxUpdateDoc,
      objectClass: core.class.AccessGroup,
      objectId: 'group-1',
      objectSpace: 'space-1',
      operations: { $pull: { members: 'b' } }
    }
    const res = await OnAccessGroupChanged([upd], control)
    expect(removedIds(res)).toEqual(['g-b']) // only the group record for b
    expect(removedIds(res)).not.toContain('m-b') // manual record untouched
    expect(removedIds(res)).not.toContain('g-a')
  })

  it('ignores AccessGroup updates that do not touch members (idempotent no-op)', async () => {
    const store: Store = {
      groups: [{ _id: 'group-1', members: ['a'] }],
      grants: [grant({ _id: 'grant-1' })],
      collaborators: [collab({ collaborator: 'a', _id: 'g-a' })]
    }
    const control = makeControl(store)
    const upd: any = {
      _class: core.class.TxUpdateDoc,
      objectClass: core.class.AccessGroup,
      objectId: 'group-1',
      objectSpace: 'space-1',
      operations: { name: 'Renamed' }
    }
    const res = await OnAccessGroupChanged([upd], control)
    expect(res).toEqual([])
  })

  it('M-02: AccessGroup remove tears down every GroupGrant and its group-collaborators (no orphans)', async () => {
    const store: Store = {
      groups: [], // group already deleted
      grants: [grant({ _id: 'grant-1', attachedTo: 'issue-1' }), grant({ _id: 'grant-2', attachedTo: 'issue-2' })],
      collaborators: [
        collab({ collaborator: 'a', _id: 'g-a1', grantedByGroup: 'grant-1', attachedTo: 'issue-1' }),
        collab({ collaborator: 'b', _id: 'g-b1', grantedByGroup: 'grant-1', attachedTo: 'issue-1' }),
        collab({ collaborator: 'a', _id: 'g-a2', grantedByGroup: 'grant-2', attachedTo: 'issue-2' })
      ]
    }
    const control = makeControl(store)
    const rm: any = {
      _class: core.class.TxRemoveDoc,
      objectClass: core.class.AccessGroup,
      objectId: 'group-1',
      objectSpace: 'space-1'
    }
    const res = await OnAccessGroupChanged([rm], control)
    // all three materialized collaborators torn down
    expect(removedIds(res).sort((a, b) => (a > b ? 1 : a < b ? -1 : 0))).toEqual(['g-a1', 'g-a2', 'g-b1'])
    // both now-orphan grants removed too
    const grantRemoves = res
      .filter((t) => t._class === core.class.TxRemoveDoc && (t as any).objectClass === core.class.GroupGrant)
      .map((t) => (t as any).objectId)
      .sort((a: string, b: string) => (a > b ? 1 : a < b ? -1 : 0))
    expect(grantRemoves).toEqual(['grant-1', 'grant-2'])
  })
})
