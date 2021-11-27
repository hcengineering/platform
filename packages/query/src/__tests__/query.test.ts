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

import core, { createClient, Doc, SortingOrder, Space, Tx, TxCreateDoc, TxOperations } from '@anticrm/core'
import { genMinModel } from './minmodel'
import { LiveQuery } from '..'
import { connect } from './connection'

interface Channel extends Space {
  x: number
}

async function getClient (): Promise<{ liveQuery: LiveQuery, factory: TxOperations }> {
  const storage = await createClient(connect)
  const liveQuery = new LiveQuery(storage)
  storage.notify = (tx: Tx) => {
    liveQuery.tx(tx).catch((err) => console.log(err))
  }
  return { liveQuery, factory: new TxOperations(storage, core.account.System) }
}

describe('query', () => {
  it('findAll', async () => {
    const { liveQuery } = await getClient()
    const result = await liveQuery.findAll<Space>(core.class.Space, {})
    expect(result).toHaveLength(2)
  })

  it('query with param', async () => {
    const { liveQuery } = await getClient()

    let expectedLength = 0
    const txes = genMinModel()
    for (let i = 0; i < txes.length; i++) {
      if (liveQuery.getHierarchy().isDerived((txes[i] as TxCreateDoc<Doc>).objectClass, core.class.Space)) {
        expectedLength++
      }
    }

    await new Promise((resolve) => {
      liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        expect(result).toHaveLength(expectedLength)
        resolve(null)
      })
    })
  })

  it('query should be live', async () => {
    const { liveQuery, factory } = await getClient()

    let expectedLength = 0
    const txes = genMinModel()
    for (let i = 0; i < txes.length; i++) {
      if (liveQuery.getHierarchy().isDerived((txes[i] as TxCreateDoc<Doc>).objectClass, core.class.Space)) {
        expectedLength++
      }
    }

    let attempt = 0
    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        console.log('query result attempt', result, attempt)
        expect(result).toHaveLength(expectedLength + attempt)
        if (attempt > 0) {
          expect((result[expectedLength + attempt - 1] as any).x).toBe(attempt)
        }
        if (attempt++ === 3) {
          // check underlying storage received all data.
          liveQuery
            .findAll<Space>(core.class.Space, { private: false })
            .then((result) => {
              expect(result).toHaveLength(expectedLength + attempt - 1)
              resolve(null)
            })
            .catch((err) => expect(err).toBeUndefined())
        }
      })
    })

    await factory.createDoc(core.class.Account, core.space.Model, {
      email: 'user1@site.com'
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: true,
      name: '#0',
      description: '',
      members: [],
      x: 0
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#1',
      description: '',
      members: [],
      x: 1
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#2',
      description: '',
      members: [],
      x: 2
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#3',
      description: '',
      members: [],
      x: 3
    })
    await pp
  })

  it('unsubscribe query', async () => {
    const { liveQuery, factory } = await getClient()

    let expectedLength = 0
    const txes = genMinModel()
    for (let i = 0; i < txes.length; i++) {
      if (liveQuery.getHierarchy().isDerived((txes[i] as TxCreateDoc<Doc>).objectClass, core.class.Space)) {
        expectedLength++
      }
    }

    const unsubscribe = liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
      expect(result).toHaveLength(expectedLength)
    })

    unsubscribe()

    await factory.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: '#1',
      description: '',
      members: []
    })
    await factory.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: '#2',
      description: '',
      members: []
    })
    await factory.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: '#3',
      description: '',
      members: []
    })
  })

  it('query against core client', async () => {
    const { liveQuery, factory } = await getClient()

    const expectedLength = 2
    let attempt = 0
    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        expect(result).toHaveLength(expectedLength + attempt)
        if (attempt > 0) {
          expect((result[expectedLength + attempt - 1] as any).x).toBe(attempt)
        }
        if (attempt++ === 1) resolve(null)
      })
    })

    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      x: 1,
      private: false,
      name: '#1',
      description: '',
      members: []
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      x: 2,
      private: false,
      name: '#2',
      description: '',
      members: []
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      x: 3,
      private: false,
      name: '#3',
      description: '',
      members: []
    })
    await pp
  })

  it('limit and sorting', async () => {
    const { liveQuery, factory } = await getClient()

    const limit = 1
    let attempt = -1
    let doneCount = 0

    const pp1 = new Promise((resolve) => {
      liveQuery.query<Space>(
        core.class.Space,
        { private: true },
        (result) => {
          if (attempt === 0 && result.length > 0) {
            expect(result.length).toEqual(limit)
            expect(result[0].name).toMatch('0')
          }
          if (attempt === 0) doneCount++
          if (doneCount === 2) resolve(null)
        },
        { limit: limit, sort: { name: SortingOrder.Ascending } }
      )
    })

    const pp2 = new Promise((resolve) => {
      liveQuery.query<Space>(
        core.class.Space,
        { private: true },
        (result) => {
          if (attempt > 0 && result.length > 0) {
            expect(result.length).toEqual(limit)
            expect(result[0].name).toMatch(attempt.toString())
          }
          if (attempt === 9) doneCount++
          if (doneCount === 2) resolve(null)
        },
        { limit: limit, sort: { name: SortingOrder.Descending } }
      )
    })

    for (let i = 0; i < 10; i++) {
      attempt = i
      await factory.createDoc(core.class.Space, core.space.Model, {
        private: true,
        name: i.toString(),
        description: '',
        members: []
      })
    }
    await Promise.all([pp1, pp2])
  })

  it('remove', async () => {
    const { liveQuery, factory } = await getClient()

    const expectedLength = 2
    let attempt = 0
    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        expect(result).toHaveLength(expectedLength - attempt)
        if (attempt++ === expectedLength) resolve(null)
      })
    })

    const spaces = await liveQuery.findAll(core.class.Space, {})
    for (const space of spaces) {
      await factory.removeDoc(space._class, space.space, space._id)
    }
    await pp
  })

  it('remove with limit', async () => {
    const { liveQuery, factory } = await getClient()

    const expectedLength = 2
    let attempt = 0
    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(
        core.class.Space,
        { private: false },
        (result) => {
          expect(result).toHaveLength(attempt++ === expectedLength ? 0 : 1)
          if (attempt === expectedLength) resolve(null)
        },
        { limit: 1 }
      )
    })

    const spaces = await liveQuery.findAll(core.class.Space, {})
    for (const space of spaces) {
      await factory.removeDoc(space._class, space.space, space._id)
    }
    await pp
  })

  it('update', async () => {
    const { liveQuery, factory } = await getClient()

    const spaces = await liveQuery.findAll(core.class.Space, {})
    let attempt = 0
    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(
        core.class.Space,
        { private: false },
        (result) => {
          if (attempt > 0) {
            expect(result[attempt - 1].name === attempt.toString())
            expect(result[attempt - 1].members.length === 1)
            if (attempt === spaces.length) resolve(null)
          }
        },
        { sort: { private: SortingOrder.Ascending } }
      )
    })

    for (const space of spaces) {
      attempt++
      await factory.updateDoc(space._class, space.space, space._id, {
        name: attempt.toString(),
        $push: { members: core.account.System }
      })
    }
    await pp
  })

  it('update with no match query', async () => {
    const { liveQuery, factory } = await getClient()

    const spaces = await liveQuery.findAll(core.class.Space, {})
    let attempt = 0
    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(
        core.class.Space,
        { private: false },
        (result) => {
          if (attempt > 0) {
            expect(result.length === spaces.length - attempt)
            if (attempt === spaces.length) resolve(null)
          }
        },
        { sort: { private: SortingOrder.Ascending } }
      )
    })

    for (const space of spaces) {
      attempt++
      await factory.updateDoc(space._class, space.space, space._id, {
        private: true
      })
    }
    await pp
  })

  // it('update with over limit', async () => {
  //   const { liveQuery, factory } = await getClient()

  //   const spaces = await liveQuery.findAll(core.class.Space, {})
  //   let attempt = 0
  //   const pp = new Promise((resolve) => {
  //     liveQuery.query<Space>(
  //       core.class.Space,
  //       {},
  //       (result) => {
  //         expect(result[0].name).toEqual(`Sp${++attempt}`)
  //         if (attempt === spaces.length + 1) resolve(null)
  //       },
  //       { sort: { name: SortingOrder.Ascending }, limit: 1 }
  //     )
  //   })

  //   for (let index = 0; index < spaces.length; index++) {
  //     const space = spaces[index]
  //     await factory.updateDoc(space._class, space.space, space._id, {
  //       name: `Sp${index + spaces.length + 1}`
  //     })
  //   }
  //   await pp
  // })
})
