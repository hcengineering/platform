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

import { Client } from '..'
import type { Class, Doc, Obj, Ref } from '../classes'
import core from '../component'
import { Hierarchy } from '../hierarchy'
import { ModelDb, TxDb } from '../memdb'
import { TxOperations } from '../operations'
import { DocumentQuery, FindOptions, SortingOrder, WithLookup } from '../storage'
import { Tx } from '../tx'
import { genMinModel, test, TestMixin } from './minmodel'

const txes = genMinModel()

class ClientModel extends ModelDb implements Client {
  notify?: ((tx: Tx) => void) | undefined

  getHierarchy (): Hierarchy {
    return this.hierarchy
  }

  getModel (): ModelDb {
    return this
  }

  async findOne<T extends Doc>(
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<WithLookup<T> | undefined> {
    return (await this.findAll(_class, query, options)).shift()
  }

  async close (): Promise<void> {}
}

async function createModel (): Promise<{ model: ClientModel, hierarchy: Hierarchy, txDb: TxDb }> {
  const hierarchy = new Hierarchy()
  for (const tx of txes) {
    hierarchy.tx(tx)
  }
  const model = new ClientModel(hierarchy)
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

    await client.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: 'NewSpace',
      description: '',
      members: [],
      archived: false
    })
    const result3 = await client.findAll(core.class.Space, {})
    expect(result3).toHaveLength(4)
  })

  it('should query model', async () => {
    const { model } = await createModel()
    const result = await model.findAll(core.class.Class, {})
    const names = result.map((d) => d._id)
    expect(names.includes(core.class.Class)).toBe(true)
    const result2 = await model.findAll(core.class.Class, { _id: undefined })
    expect(result2.length).toBe(0)
  })

  it('should fail query wrong class', async () => {
    const { model } = await createModel()

    await expect(model.findAll('class:workbench.Application' as Ref<Class<Doc>>, { _id: undefined })).rejects.toThrow()
  })

  it('should create mixin', async () => {
    const { model } = await createModel()
    const ops = new TxOperations(model, core.account.System)

    await ops.createMixin<Doc, TestMixin>(core.class.Obj, core.class.Class, core.space.Model, test.mixin.TestMixin, {
      arr: ['hello']
    })
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

    const classes = await model.findAll(core.class.Class, {})
    const gt = await model.findAll(core.class.Class, {
      kind: { $gt: 1 }
    })
    expect(gt.length).toBe(classes.filter((p) => p.kind > 1).length)
    const gte = await model.findAll(core.class.Class, {
      kind: { $gte: 1 }
    })
    expect(gte.length).toBe(classes.filter((p) => p.kind >= 1).length)
    const lt = await model.findAll(core.class.Class, {
      kind: { $lt: 1 }
    })
    expect(lt.length).toBe(classes.filter((p) => p.kind < 1).length)
    const lte = await model.findAll(core.class.Class, {
      kind: { $lt: 1 }
    })
    expect(lte.length).toBe(classes.filter((p) => p.kind <= 1).length)
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
      space: { $like: 'core:space:M%' }
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

    const regex = await model.findAll(core.class.Doc, {
      space: { $regex: '.*Mod.*' }
    })
    expect(regex).toHaveLength(expectedLength)
  })

  it('should push to array', async () => {
    const hierarchy = new Hierarchy()
    for (const tx of txes) hierarchy.tx(tx)
    const model = new TxOperations(new ClientModel(hierarchy), core.account.System)
    for (const tx of txes) await model.tx(tx)
    const space = await model.createDoc(core.class.Space, core.space.Model, {
      name: 'name',
      description: 'desc',
      private: false,
      members: [],
      archived: false
    })
    const account = await model.createDoc(core.class.Account, core.space.Model, {
      email: 'email',
      role: 0
    })
    await model.updateDoc(core.class.Space, core.space.Model, space, { $push: { members: account } })
    const txSpace = await model.findAll(core.class.Space, { _id: space })
    expect(txSpace[0].members).toEqual(expect.arrayContaining([account]))
  })

  it('limit and sorting', async () => {
    const hierarchy = new Hierarchy()
    for (const tx of txes) hierarchy.tx(tx)
    const model = new TxOperations(new ClientModel(hierarchy), core.account.System)
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

  it('lookups', async () => {
    const { model } = await createModel()

    const client = new TxOperations(model, core.account.System)
    const spaces = await client.findAll(core.class.Space, {})
    expect(spaces).toHaveLength(2)

    const first = await client.addCollection(
      test.class.TestComment,
      core.space.Model,
      spaces[0]._id,
      spaces[0]._class,
      'comments',
      {
        message: 'msg'
      }
    )

    const second = await client.addCollection(
      test.class.TestComment,
      core.space.Model,
      first,
      test.class.TestComment,
      'comments',
      {
        message: 'msg2'
      }
    )

    await client.addCollection(test.class.TestComment, core.space.Model, spaces[0]._id, spaces[0]._class, 'comments', {
      message: 'msg3'
    })

    const simple = await client.findAll(
      test.class.TestComment,
      { _id: first },
      { lookup: { attachedTo: spaces[0]._class } }
    )
    expect(simple[0].$lookup?.attachedTo).toEqual(spaces[0])

    const nested = await client.findAll(
      test.class.TestComment,
      { _id: second },
      { lookup: { attachedTo: [test.class.TestComment, { attachedTo: spaces[0]._class } as any] } }
    )
    expect((nested[0].$lookup?.attachedTo as any).$lookup?.attachedTo).toEqual(spaces[0])

    const reverse = await client.findAll(
      spaces[0]._class,
      { _id: spaces[0]._id },
      { lookup: { _id: { comments: test.class.TestComment } } }
    )
    expect((reverse[0].$lookup as any).comments).toHaveLength(2)
  })

  it('mixin lookups', async () => {
    const { model } = await createModel()

    const client = new TxOperations(model, core.account.System)
    const spaces = await client.findAll(core.class.Space, {})
    expect(spaces).toHaveLength(2)

    const task = await client.createDoc(test.class.Task, spaces[0]._id, {
      name: 'TSK1',
      number: 1,
      state: 0
    })

    await client.createMixin(task, test.class.Task, spaces[0]._id, test.mixin.TaskMixinTodos, {
      todos: 0
    })

    await client.addCollection(test.class.TestMixinTodo, spaces[0]._id, task, test.mixin.TaskMixinTodos, 'todos', {
      text: 'qwe'
    })
    await client.addCollection(test.class.TestMixinTodo, spaces[0]._id, task, test.mixin.TaskMixinTodos, 'todos', {
      text: 'qwe2'
    })

    const results = await client.findAll(
      test.class.TestMixinTodo,
      {},
      { lookup: { attachedTo: test.mixin.TaskMixinTodos } }
    )
    expect(results.length).toEqual(2)
    const attached = results[0].$lookup?.attachedTo
    expect(attached).toBeDefined()
    expect(Hierarchy.mixinOrClass(attached as Doc)).toEqual(test.mixin.TaskMixinTodos)
  })

  it('createDoc for AttachedDoc', async () => {
    expect.assertions(1)
    const { model } = await createModel()

    const client = new TxOperations(model, core.account.System)
    const spaces = await client.findAll(core.class.Space, {})
    const task = await client.createDoc(test.class.Task, spaces[0]._id, {
      name: 'TSK1',
      number: 1,
      state: 0
    })
    try {
      await client.createDoc(test.class.TestMixinTodo, spaces[0]._id, {
        text: '',
        attachedTo: task,
        attachedToClass: test.mixin.TaskMixinTodos,
        collection: 'todos'
      })
    } catch (e) {
      expect(e).toEqual(new Error('createDoc cannot be used for objects inherited from AttachedDoc'))
    }
  })
})
