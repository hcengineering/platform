//
// Copyright © 2021 Anticrm Platform Contributors.
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

import type { Class, Client, Doc, DocumentQuery, FindOptions, FindResult, Obj, Ref, Space, Tx, TxCreateDoc } from '@anticrm/core'
import core, { createClient, DOMAIN_TX, Hierarchy, ModelDb, TxDb, withOperations, SortingOrder } from '@anticrm/core'
import { genMinModel as getModel } from '@anticrm/core/src/__tests__/minmodel'
import { LiveQuery } from '..'
import { connect } from './connection'

interface Channel extends Space {
  x: number
}
describe('query', () => {
  it('findAll', async () => {
    const client = await getClient()
    const query = withOperations(core.account.System, new LiveQuery(client))
    const result = await query.findAll<Space>(core.class.Space, {})
    expect(result).toHaveLength(2)
  })

  it('query with param', async (done) => {
    const storage = await getClient()

    let expectedLength = 0
    const txes = await getModel()
    for (let i = 0; i < txes.length; i++) {
      if (storage.getHierarchy().isDerived((txes[i] as TxCreateDoc<Doc>).objectClass, core.class.Space)) {
        expectedLength++
      }
    }

    const query = new LiveQuery(storage)
    query.query<Space>(core.class.Space, { private: false }, (result) => {
      expect(result).toHaveLength(expectedLength)
      done()
    })
  })

  it('query should be live', async (done) => {
    const storage = await getClient()

    let expectedLength = 0
    const txes = await getModel()
    for (let i = 0; i < txes.length; i++) {
      if (storage.getHierarchy().isDerived((txes[i] as TxCreateDoc<Doc>).objectClass, core.class.Space)) {
        expectedLength++
      }
    }

    let attempt = 0
    const query = withOperations(core.account.System, new LiveQuery(storage))
    query.query<Space>(core.class.Space, { private: false }, (result) => {
      expect(result).toHaveLength(expectedLength + attempt)
      if (attempt > 0) {
        expect((result[expectedLength + attempt - 1] as any).x).toBe(attempt)
      }
      if (attempt++ === 3) {
        // check underlying storage received all data.
        storage
          .findAll<Space>(core.class.Space, { private: false })
          .then((result) => {
            expect(result).toHaveLength(expectedLength + attempt - 1)
            done()
          })
          .catch((err) => expect(err).toBeUndefined())
      }
    })

    await query.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#1',
      description: '',
      members: [],
      x: 1
    })
    await query.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#2',
      description: '',
      members: [],
      x: 2
    })
    await query.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#3',
      description: '',
      members: [],
      x: 3
    })
  })

  it('unsubscribe query', async () => {
    const storage = await getClient()

    let expectedLength = 0
    const txes = await getModel()
    for (let i = 0; i < txes.length; i++) {
      if (storage.getHierarchy().isDerived((txes[i] as TxCreateDoc<Doc>).objectClass, core.class.Space)) {
        expectedLength++
      }
    }

    const query = withOperations(core.account.System, new LiveQuery(storage))
    const unsubscribe = query.query<Space>(core.class.Space, { private: false }, (result) => {
      expect(result).toHaveLength(expectedLength)
    })

    unsubscribe()

    await query.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: '#1',
      description: '',
      members: []
    })
    await query.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: '#2',
      description: '',
      members: []
    })
    await query.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: '#3',
      description: '',
      members: []
    })
  })

  it('query against core client', async (done) => {
    const client = await createClient(connect)

    const expectedLength = 2
    let attempt = 0
    const query = withOperations(core.account.System, new LiveQuery(client))
    query.query<Space>(core.class.Space, { private: false }, (result) => {
      expect(result).toHaveLength(expectedLength + attempt)
      if (attempt > 0) {
        expect((result[expectedLength + attempt - 1] as any).x).toBe(attempt)
      }
      if (attempt++ === 1) done()
    })

    await query.createDoc<Channel>(core.class.Space, core.space.Model, {
      x: 1,
      private: false,
      name: '#1',
      description: '',
      members: []
    })
    await query.createDoc<Channel>(core.class.Space, core.space.Model, {
      x: 2,
      private: false,
      name: '#2',
      description: '',
      members: []
    })
    await query.createDoc<Channel>(core.class.Space, core.space.Model, {
      x: 3,
      private: false,
      name: '#3',
      description: '',
      members: []
    })
  })

  it('limit and sorting', async (done) => {
    const storage = await getClient()

    const limit = 1
    let attempt = 0
    let doneCount = 0

    const query = withOperations(core.account.System, new LiveQuery(storage))
    query.query<Space>(core.class.Space, { private: true }, (result) => {
      if (attempt > 0 && result.length > 0) {
        expect(result.length).toEqual(limit)
        expect(result[0].name).toMatch('0')
      }
      if (attempt === 1) doneCount++
      if (doneCount === 2) done()
    }, { limit: limit, sort: { name: SortingOrder.Ascending } })

    query.query<Space>(core.class.Space, { private: true }, (result) => {
      if (attempt > 0 && result.length > 0) {
        expect(result.length).toEqual(limit)
        expect(result[0].name).toMatch(attempt.toString())
      }
      if (attempt === 10) doneCount++
      if (doneCount === 2) done()
    }, { limit: limit, sort: { name: SortingOrder.Descending } })

    for (let i = 0; i < 10; i++) {
      attempt++
      await query.createDoc(core.class.Space, core.space.Model, {
        private: true,
        name: i.toString(),
        description: '',
        members: []
      })
    }
  })
  it('remove', async (done) => {
    const client = await createClient(connect)

    const expectedLength = 2
    let attempt = 0
    const query = withOperations(core.account.System, new LiveQuery(client))
    query.query<Space>(core.class.Space, { private: false }, (result) => {
      expect(result).toHaveLength(expectedLength - attempt)
      if (attempt++ === expectedLength) done()
    })

    const spaces = await query.findAll(core.class.Space, {})
    for (const space of spaces) {
      await query.removeDoc(space._class, space.space, space._id)
    }
  })
})

class ClientImpl implements Client {
  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly model: ModelDb,
    private readonly transactions: TxDb
  ) {}

  async tx (tx: Tx): Promise<void> {
    await Promise.all([this.model.tx(tx), this.transactions.tx(tx)])
  }

  getHierarchy(): Hierarchy {
    return this.hierarchy
  }

  async findAll<T extends Doc>(_class: Ref<Class<T>>, query: DocumentQuery<T>, options?: FindOptions<T>): Promise<FindResult<T>> {
    const domain = this.hierarchy.getClass(_class).domain
    if (domain === DOMAIN_TX) return await this.transactions.findAll(_class, query, options)
    return await this.model.findAll(_class, query, options)
  }
}

async function getClient (): Promise<Client> {
  const hierarchy = new Hierarchy()
  const transactions = new TxDb(hierarchy)
  const model = new ModelDb(hierarchy)
  const txes = await getModel()
  for (const tx of txes) hierarchy.tx(tx)
  for (const tx of txes) await model.tx(tx)
  return new ClientImpl(hierarchy, model, transactions)
}
