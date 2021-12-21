//
// Copyright © 2020 Anticrm Platform Contributors.
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

import type { Class, Obj, Ref, Doc } from '../classes'
import core from '../component'
import { Hierarchy } from '../hierarchy'
import { ModelDb, TxDb } from '../memdb'
import { SortingOrder } from '../storage'
import { TxOperations } from '../tx'
import { genMinModel, test, TestMixin } from './minmodel'

const txes = genMinModel()

async function createModel (): Promise<{ model: ModelDb, hierarchy: Hierarchy, txDb: TxDb }> {
  const hierarchy = new Hierarchy()
  for (const tx of txes) {
    hierarchy.tx(tx)
  }
  const model = new ModelDb(hierarchy)
  for (const tx of txes) {
    await model.tx(tx)
  }
  const txDb = new TxDb(hierarchy)
  for (const tx of txes) await txDb.tx(tx)
  return { model, hierarchy, txDb }
}

describe('memdb', () => {
  it('should save all tx', async () => {
    const { txDb } = await createModel()

    const result = await txDb.findAll(core.class.Tx, {})
    expect(result.length).toBe(txes.filter((tx) => tx._class === core.class.TxCreateDoc).length)
  })

  it('should query model', async () => {
    const { model } = await createModel()

    const result = await model.findAll(core.class.Class, {})
    expect(result.length).toBeGreaterThan(5)
    const result2 = await model.findAll('class:workbench.Application' as Ref<Class<Doc>>, { _id: undefined })
    expect(result2).toHaveLength(0)
  })

  it('should create space', async () => {
    const { model } = await createModel()

    const client = new TxOperations(model, core.account.System)
    const result = await client.findAll(core.class.Space, {})
    expect(result).toHaveLength(2)

    await client.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: 'NewSpace',
      description: '',
      members: [],
      archived: false
    })
    const result2 = await client.findAll(core.class.Space, {})
    expect(result2).toHaveLength(3)

    await client.createDoc(core.class.Space, core.space.Model, { private: false, name: 'NewSpace', description: '', members: [], archived: false })
    const result3 = await client.findAll(core.class.Space, {})
    expect(result3).toHaveLength(4)
  })

  it('should query model', async () => {
    const { model } = await createModel()
    const result = await model.findAll(core.class.Class, {})
    const names = result.map(d => d._id)
    expect(names.includes(core.class.Class)).toBe(true)
    const result2 = await model.findAll(core.class.Class, { _id: undefined })
    expect(result2.length).toBe(0)
  })

  it('should create mixin', async () => {
    const { model } = await createModel()
    const ops = new TxOperations(model, core.account.System)

    await ops.createMixin(core.class.Obj, core.class.Class, test.mixin.TestMixin, { arr: ['hello'] })
    const objClass = (await model.findAll(core.class.Class, { _id: core.class.Obj }))[0] as any
    expect(objClass['test:mixin:TestMixin'].arr).toEqual(expect.arrayContaining(['hello']))

    await ops.updateDoc(test.mixin.TestMixin, core.space.Model, core.class.Obj as unknown as Ref<TestMixin>, {
      $pushMixin: {
        $mixin: test.mixin.TestMixin,
        values: {
          arr: 'there'
        }
      }
    })

    const objClass2 = (await model.findAll(core.class.Class, { _id: core.class.Obj }))[0] as any
    expect(objClass2['test:mixin:TestMixin'].arr).toEqual(expect.arrayContaining(['hello', 'there']))
  })

  it('should allow delete', async () => {
    const { model } = await createModel()
    const result = await model.findAll(core.class.Space, {})
    expect(result.length).toBe(2)

    const ops = new TxOperations(model, core.account.System)
    await ops.removeDoc(result[0]._class, result[0].space, result[0]._id)
    const result2 = await model.findAll(core.class.Space, {})
    expect(result2).toHaveLength(1)
  })

  it('should query model with params', async () => {
    const { model } = await createModel()
    const first = await model.findAll(core.class.Class, {
      _id: txes[1].objectId as Ref<Class<Obj>>,
      kind: 0
    })
    expect(first.length).toBe(1)
    const second = await model.findAll(core.class.Class, {
      _id: { $in: [txes[1].objectId as Ref<Class<Obj>>, txes[3].objectId as Ref<Class<Obj>>] }
    })
    expect(second.length).toBe(2)
    const incorrectId = await model.findAll(core.class.Class, {
      _id: (txes[1].objectId + 'test') as Ref<Class<Obj>>
    })
    expect(incorrectId.length).toBe(0)
    const result = await model.findAll(core.class.Class, {
      _id: txes[1].objectId as Ref<Class<Obj>>,
      kind: 1
    })
    expect(result.length).toBe(0)
    const multipleParam = await model.findAll(core.class.Doc, {
      space: { $in: [core.space.Model, core.space.Tx] }
    })
    expect(multipleParam.length).toBeGreaterThan(5)
  })

  it('should query model like params', async () => {
    const { model } = await createModel()
    const expectedLength = txes.filter((tx) => tx.objectSpace === core.space.Model).length
    const without = await model.findAll(core.class.Doc, {
      space: { $like: core.space.Model }
    })
    expect(without).toHaveLength(expectedLength)
    const begin = await model.findAll(core.class.Doc, {
      space: { $like: '%Model' }
    })
    expect(begin).toHaveLength(expectedLength)
    const zero = await model.findAll(core.class.Doc, {
      space: { $like: 'Model' }
    })
    expect(zero).toHaveLength(0)
    const end = await model.findAll(core.class.Doc, {
      space: { $like: 'core.space.M%' }
    })
    expect(end).toHaveLength(expectedLength)
    const mid = await model.findAll(core.class.Doc, {
      space: { $like: '%M%de%' }
    })
    expect(mid).toHaveLength(expectedLength)
    const all = await model.findAll(core.class.Doc, {
      space: { $like: '%Mod%' }
    })
    expect(all).toHaveLength(expectedLength)
  })

  it('should push to array', async () => {
    const hierarchy = new Hierarchy()
    for (const tx of txes) hierarchy.tx(tx)
    const model = new TxOperations(new ModelDb(hierarchy), core.account.System)
    for (const tx of txes) await model.tx(tx)
    const space = await model.createDoc(core.class.Space, core.space.Model, {
      name: 'name',
      description: 'desc',
      private: false,
      members: [],
      archived: false
    })
    const account = await model.createDoc(core.class.Account, core.space.Model, { email: 'email' })
    await model.updateDoc(core.class.Space, core.space.Model, space, { $push: { members: account } })
    const txSpace = await model.findAll(core.class.Space, { _id: space })
    expect(txSpace[0].members).toEqual(expect.arrayContaining([account]))
  })

  it('limit and sorting', async () => {
    const hierarchy = new Hierarchy()
    for (const tx of txes) hierarchy.tx(tx)
    const model = new TxOperations(new ModelDb(hierarchy), core.account.System)
    for (const tx of txes) await model.tx(tx)

    const without = await model.findAll(core.class.Space, {})
    expect(without).toHaveLength(2)

    const limit = await model.findAll(core.class.Space, {}, { limit: 1 })
    expect(limit).toHaveLength(1)

    const sortAsc = await model.findAll(core.class.Space, {}, { limit: 1, sort: { name: SortingOrder.Ascending } })
    expect(sortAsc[0].name).toMatch('Sp1')

    const sortDesc = await model.findAll(core.class.Space, {}, { limit: 1, sort: { name: SortingOrder.Descending } })
    expect(sortDesc[0].name).toMatch('Sp2')

    const numberSortDesc = await model.findAll(core.class.Doc, {}, { sort: { modifiedOn: SortingOrder.Descending } })
    expect(numberSortDesc[0].modifiedOn).toBeGreaterThanOrEqual(numberSortDesc[numberSortDesc.length - 1].modifiedOn)

    const numberSort = await model.findAll(core.class.Doc, {}, { sort: { modifiedOn: SortingOrder.Ascending } })
    expect(numberSort[0].modifiedOn).toBeLessThanOrEqual(numberSort[numberSortDesc.length - 1].modifiedOn)
  })

  it('should add attached document', async () => {
    const { model } = await createModel()

    const client = new TxOperations(model, core.account.System)
    const result = await client.findAll(core.class.Space, {})
    expect(result).toHaveLength(2)

    await client.addCollection(test.class.TestComment, core.space.Model, result[0]._id, result[0]._class, 'comments', {
      message: 'msg'
    })
    const result2 = await client.findAll(test.class.TestComment, {})
    expect(result2).toHaveLength(1)
  })
})
