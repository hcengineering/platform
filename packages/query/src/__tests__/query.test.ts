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

import core, {
  createClient,
  Doc,
  generateId,
  MeasureMetricsContext,
  Ref,
  SortingOrder,
  Space,
  systemAccountUuid,
  Tx,
  TxCreateDoc,
  TxOperations,
  WithLookup
} from '@hcengineering/core'
import { LiveQuery } from '..'
import { connect } from './connection'
import { AttachedComment, genMinModel, ParticipantsHolder, test } from './minmodel'

interface Channel extends Space {
  x: number
}

async function getClient (): Promise<{ liveQuery: LiveQuery, factory: TxOperations }> {
  const storage = await createClient(connect)
  const liveQuery = new LiveQuery(storage)
  storage.notify = (...tx: Tx[]) => {
    liveQuery.tx(...tx).catch((err) => {
      console.log(err)
    })
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

    const result = await new Promise((resolve) => {
      liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        resolve(result)
      })
    })
    expect(result).toHaveLength(expectedLength)
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
            .catch((err) => {
              expect(err).toBeUndefined()
            })
        }
      })
    })

    // TODO: fixme!
    // await factory.createDoc(core.class.Account, core.space.Model, {
    //   email: 'user1@site.com',
    //   role: AccountRole.User
    // })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: true,
      name: '#0',
      description: '',
      members: [],
      archived: false,
      x: 0
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#1',
      description: '',
      members: [],
      archived: false,
      x: 1
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#2',
      description: '',
      members: [],
      archived: false,
      x: 2
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      private: false,
      name: '#3',
      description: '',
      members: [],
      archived: false,
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
      archived: false,
      members: []
    })
    await factory.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: '#2',
      description: '',
      archived: false,
      members: []
    })
    await factory.createDoc(core.class.Space, core.space.Model, {
      private: false,
      name: '#3',
      description: '',
      archived: false,
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
      archived: false,
      members: []
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      x: 2,
      private: false,
      name: '#2',
      description: '',
      archived: false,
      members: []
    })
    await factory.createDoc<Channel>(core.class.Space, core.space.Model, {
      x: 3,
      private: false,
      name: '#3',
      description: '',
      archived: false,
      members: []
    })
    await pp
  })

  it('limit and sorting', async () => {
    const { liveQuery, factory } = await getClient()

    const limit = 1
    let attempt = 0
    let descAttempt = 0

    const pp1 = new Promise((resolve) => {
      liveQuery.query<Space>(
        core.class.Space,
        { private: true },
        (result) => {
          if (result.length > 0) {
            expect(result.length).toEqual(limit)
            expect(result[0].name).toMatch('0')
            attempt++
          }
          if (attempt === 1) resolve(null)
        },
        { limit, sort: { name: SortingOrder.Ascending } }
      )
    })

    const pp2 = new Promise((resolve) => {
      liveQuery.query<Space>(
        core.class.Space,
        { private: true },
        (result) => {
          if (result.length > 0) {
            expect(result.length).toEqual(limit)
            expect(result[0].name).toMatch(descAttempt.toString())
            descAttempt++
          }
          if (descAttempt === 10) resolve(null)
        },
        { limit, sort: { name: SortingOrder.Descending } }
      )
    })

    for (let i = 0; i < 10; i++) {
      await factory.createDoc(core.class.Space, core.space.Model, {
        private: true,
        name: i.toString(),
        description: '',
        archived: false,
        members: []
      })
    }
    await Promise.all([pp1, pp2])
  })

  it('remove', async () => {
    const { liveQuery, factory } = await getClient()

    const expectedLength = 2
    let attempt = 0
    let x: undefined | ((s: any) => void)
    const y = new Promise((resolve) => (x = resolve))

    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(core.class.Space, { private: false }, (result) => {
        expect(result).toHaveLength(expectedLength - attempt)
        if (attempt === 0) x?.(null)
        if (attempt++ === expectedLength) resolve(null)
      })
    })
    await y
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
    let x: undefined | ((s: any) => void)
    const y = new Promise((resolve) => (x = resolve))
    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(
        core.class.Space,
        { private: false },
        (result) => {
          if (attempt === 0) x?.(null)
          expect(result).toHaveLength(attempt++ === expectedLength ? 0 : 1)
          if (attempt === expectedLength) resolve(null)
        },
        { limit: 1 }
      )
    })

    await y
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
        $push: { members: systemAccountUuid }
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

  it('lookup query add doc', async () => {
    const { liveQuery, factory } = await getClient()
    const futureSpace: Space = {
      _id: generateId(),
      _class: core.class.Space,
      private: false,
      members: [],
      space: core.space.Model,
      name: 'new space',
      description: '',
      archived: false,
      modifiedBy: core.account.System,
      modifiedOn: 0
    }
    const comment = await factory.addCollection(
      test.class.TestComment,
      futureSpace._id,
      futureSpace._id,
      core.class.Space,
      'comments',
      {
        message: 'test'
      }
    )
    let attempt = 0
    const pp = new Promise((resolve) => {
      liveQuery.query<AttachedComment>(
        test.class.TestComment,
        { _id: comment },
        (result) => {
          const comment = result[0]
          if (comment !== undefined) {
            if (attempt > 0) {
              expect(comment.$lookup?.space?._id).toEqual(futureSpace._id)
              resolve(null)
            } else {
              expect(comment.$lookup?.space).toBeUndefined()
              attempt++
              void factory.createDoc(
                core.class.Space,
                futureSpace.space,
                {
                  ...futureSpace
                },
                futureSpace._id
              )
            }
          }
        },
        { lookup: { space: core.class.Space } }
      )
    })

    await pp
  })

  it('lookup nested query add doc', async () => {
    const { liveQuery, factory } = await getClient()
    const futureSpace: Space = {
      _id: generateId(),
      _class: core.class.Space,
      private: false,
      members: [],
      space: core.space.Model,
      name: 'new space',
      description: '',
      archived: false,
      modifiedBy: core.account.System,
      modifiedOn: 0
    }
    const comment = await factory.addCollection(
      test.class.TestComment,
      futureSpace._id,
      futureSpace._id,
      core.class.Space,
      'comments',
      {
        message: 'test'
      }
    )
    const childComment = await factory.addCollection(
      test.class.TestComment,
      futureSpace._id,
      comment,
      test.class.TestComment,
      'comments',
      {
        message: 'child'
      }
    )
    const pp = new Promise((resolve) => {
      liveQuery.query<AttachedComment>(
        test.class.TestComment,
        { _id: childComment },
        (result) => {
          const comment = result[0]
          if (comment !== undefined) {
            expect((comment.$lookup?.attachedTo as WithLookup<AttachedComment>)?.$lookup?.space?._id).toEqual(
              futureSpace._id
            )
            resolve(null)
          }
        },
        { lookup: { attachedTo: [test.class.TestComment, { space: core.class.Space }] } }
      )
    })

    await factory.createDoc(
      core.class.Space,
      futureSpace.space,
      {
        ...futureSpace
      },
      futureSpace._id
    )
    await pp
  })

  it('lookup reverse query add doc', async () => {
    const { liveQuery, factory } = await getClient()
    const spaces = await liveQuery.findAll(core.class.Space, {})
    const parentComment = await factory.addCollection(
      test.class.TestComment,
      spaces[0]._id,
      spaces[0]._id,
      spaces[0]._class,
      'comments',
      {
        message: 'test'
      }
    )
    const childLength = 3
    const pp = new Promise((resolve) => {
      liveQuery.query<AttachedComment>(
        test.class.TestComment,
        { _id: parentComment },
        (result) => {
          const comment = result[0]
          const res = (comment.$lookup as any)?.comments?.length

          if (res !== undefined) {
            expect(res).toBeGreaterThanOrEqual(1)
            expect(res).toBeLessThanOrEqual(childLength)
          }
          if ((res ?? 0) === childLength) {
            resolve(null)
          }
        },
        { lookup: { _id: { comments: test.class.TestComment } } }
      )
    })

    for (let index = 0; index < childLength; index++) {
      await factory.addCollection(
        test.class.TestComment,
        spaces[0]._id,
        parentComment,
        test.class.TestComment,
        'comments',
        {
          message: index.toString()
        }
      )
    }
    await pp
  })

  it('lookup query remove doc', async () => {
    const { liveQuery, factory } = await getClient()
    const futureSpace = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'new space',
      description: '',
      archived: false,
      private: false,
      members: []
    })
    const comment = await factory.addCollection(
      test.class.TestComment,
      futureSpace,
      futureSpace,
      core.class.Space,
      'comments',
      {
        message: 'test'
      }
    )
    let attempt = 0
    const pp = new Promise((resolve) => {
      liveQuery.query<AttachedComment>(
        test.class.TestComment,
        { _id: comment },
        (result) => {
          const comment = result[0]
          if (comment !== undefined) {
            if (attempt > 0) {
              expect(comment.$lookup?.space).toBeUndefined()
              resolve(null)
            } else {
              expect((comment.$lookup?.space as Doc)?._id).toEqual(futureSpace)
              attempt++
              void factory.removeDoc(core.class.Space, core.space.Model, futureSpace)
            }
          }
        },
        { lookup: { space: core.class.Space } }
      )
    })

    await pp
  })

  it('lookup nested query remove doc', async () => {
    const { liveQuery, factory } = await getClient()
    const futureSpace = await factory.createDoc(core.class.Space, core.space.Model, {
      name: 'new space',
      description: '',
      archived: false,
      private: false,
      members: []
    })
    const comment = await factory.addCollection(
      test.class.TestComment,
      futureSpace,
      futureSpace,
      core.class.Space,
      'comments',
      {
        message: 'test'
      }
    )
    const childComment = await factory.addCollection(
      test.class.TestComment,
      futureSpace,
      comment,
      test.class.TestComment,
      'comments',
      {
        message: 'child'
      }
    )
    const pp = new Promise((resolve) => {
      liveQuery.query<AttachedComment>(
        test.class.TestComment,
        { _id: childComment },
        (result) => {
          const comment = result[0]
          if (comment !== undefined) {
            expect((comment.$lookup?.attachedTo as WithLookup<AttachedComment>)?.$lookup?.space).toBeUndefined()
            resolve(null)
          }
        },
        { lookup: { attachedTo: [test.class.TestComment, { space: core.class.Space }] } }
      )
    })

    await factory.removeDoc(core.class.Space, core.space.Model, futureSpace)

    await pp
  })

  it('lookup reverse query remove doc', async () => {
    const { liveQuery, factory } = await getClient()
    const spaces = await liveQuery.findAll(core.class.Space, {})
    const comments = await liveQuery.findAll(test.class.TestComment, {})
    expect(comments).toHaveLength(0)
    const parentComment = await factory.addCollection(
      test.class.TestComment,
      spaces[0]._id,
      spaces[0]._id,
      spaces[0]._class,
      'comments',
      {
        message: 'test'
      }
    )
    let attempt = -1
    const childLength = 3
    const childs: Ref<AttachedComment>[] = []
    for (let index = 0; index < childLength; index++) {
      childs.push(
        await factory.addCollection(
          test.class.TestComment,
          spaces[0]._id,
          parentComment,
          test.class.TestComment,
          'comments',
          {
            message: index.toString()
          }
        )
      )
    }

    let secondPromise: Promise<void> | undefined
    const firstCallback = new Promise<void>((resolve) => {
      secondPromise = new Promise<void>((_resolve) => {
        liveQuery.query<AttachedComment>(
          test.class.TestComment,
          { _id: parentComment },
          (result) => {
            attempt++
            if (attempt === 0) {
              resolve()
            }
            const comment = result[0]
            if (comment !== undefined) {
              expect((comment.$lookup as any)?.comments).toHaveLength(childLength - attempt)
            }
            if (attempt === childLength) {
              _resolve()
            }
          },
          { lookup: { _id: { comments: test.class.TestComment } } }
        )
      })
    })

    await firstCallback

    for (const child of childs) {
      await factory.removeCollection(
        test.class.TestComment,
        spaces[0]._id,
        child,
        parentComment,
        test.class.TestComment,
        'comments'
      )
    }
    await secondPromise
  })

  it('lookup query update doc', async () => {
    const { liveQuery, factory } = await getClient()
    let attempt = 0
    const futureSpace = await factory.createDoc(core.class.Space, core.space.Model, {
      name: '0',
      description: '',
      archived: false,
      private: false,
      members: []
    })

    const comment = await factory.addCollection(
      test.class.TestComment,
      futureSpace,
      futureSpace,
      core.class.Space,
      'comments',
      {
        message: 'test'
      }
    )
    const pp = new Promise((resolve) => {
      liveQuery.query<AttachedComment>(
        test.class.TestComment,
        { _id: comment },
        (result) => {
          const comment = result[0]
          if (comment !== undefined) {
            expect((comment.$lookup?.space as Space).name).toEqual(attempt.toString())
          }
          if (attempt > 0) {
            resolve(null)
          } else {
            attempt++
          }
        },
        { lookup: { space: core.class.Space } }
      )
    })

    await new Promise((resolve) => {
      setTimeout(resolve, 1)
    })

    await factory.updateDoc(core.class.Space, core.space.Model, futureSpace, {
      name: '1'
    })
    await pp
  })

  it('lookup nested query update doc', async () => {
    const { liveQuery, factory } = await getClient()
    let attempt = -1
    const futureSpace = await factory.createDoc(core.class.Space, core.space.Model, {
      name: '0',
      description: '',
      archived: false,
      private: false,
      members: []
    })
    const comment = await factory.addCollection(
      test.class.TestComment,
      futureSpace,
      futureSpace,
      core.class.Space,
      'comments',
      {
        message: 'test'
      }
    )
    const childComment = await factory.addCollection(
      test.class.TestComment,
      futureSpace,
      comment,
      test.class.TestComment,
      'comments',
      {
        message: 'child'
      }
    )
    const pp = new Promise((resolve) => {
      liveQuery.query<AttachedComment>(
        test.class.TestComment,
        { _id: childComment },
        (result) => {
          attempt++
          const comment = result[0]
          if (comment !== undefined) {
            expect(
              ((comment.$lookup?.attachedTo as WithLookup<AttachedComment>)?.$lookup?.space as Space).name
            ).toEqual(attempt.toString())
          }
          if (attempt > 0) {
            resolve(null)
          }
        },
        { lookup: { attachedTo: [test.class.TestComment, { space: core.class.Space }] } }
      )
    })

    await factory.updateDoc(core.class.Space, core.space.Model, futureSpace, {
      name: '1'
    })
    await pp
  })

  it('lookup reverse query update doc', async () => {
    const { liveQuery, factory } = await getClient()
    const spaces = await liveQuery.findAll(core.class.Space, {})
    const parentComment = await factory.addCollection(
      test.class.TestComment,
      spaces[0]._id,
      spaces[0]._id,
      spaces[0]._class,
      'comments',
      {
        message: 'test'
      }
    )
    let attempt = -1
    const childComment = await factory.addCollection(
      test.class.TestComment,
      spaces[0]._id,
      parentComment,
      test.class.TestComment,
      'comments',
      {
        message: '0'
      }
    )
    const pp = new Promise((resolve) => {
      liveQuery.query<AttachedComment>(
        test.class.TestComment,
        { _id: parentComment },
        (result) => {
          attempt++
          const comment = result[0]
          if (comment !== undefined) {
            expect(((comment.$lookup as any)?.comments[0] as AttachedComment).message).toEqual(attempt.toString())
          }
          if (attempt > 0) {
            resolve(null)
          }
        },
        { lookup: { _id: { comments: test.class.TestComment } } }
      )
    })

    await factory.updateCollection(
      test.class.TestComment,
      spaces[0]._id,
      childComment,
      parentComment,
      test.class.TestComment,
      'comments',
      {
        message: '1'
      }
    )
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

  it('update-array-value', async () => {
    const { liveQuery, factory } = await getClient()

    const spaces = await liveQuery.findAll(core.class.Space, {})
    await factory.createDoc(test.class.ParticipantsHolder, spaces[0]._id, {
      participants: ['a' as Ref<Doc>]
    })
    const a2 = await factory.createDoc(test.class.ParticipantsHolder, spaces[0]._id, {
      participants: ['b' as Ref<Doc>]
    })

    const holderBefore = await liveQuery.findAll(test.class.ParticipantsHolder, { participants: 'a' as Ref<Doc> })
    expect(holderBefore.length).toEqual(1)

    let attempt = 0
    let resolvePpv: (value: Doc[] | PromiseLike<Doc[]>) => void

    const resolveP = new Promise<Doc[]>((resolve) => {
      resolvePpv = resolve
    })
    const pp = await new Promise((resolve) => {
      liveQuery.query<Space>(
        test.class.ParticipantsHolder,
        { participants: 'a' as Ref<Doc> },
        (result) => {
          if (attempt > 0) {
            resolvePpv(result)
          } else {
            resolve(null)
          }
        },
        { sort: { private: SortingOrder.Ascending } }
      )
    })

    await pp // We have first value returned

    attempt++
    await factory.updateDoc<ParticipantsHolder>(test.class.ParticipantsHolder, spaces[0]._id, a2, {
      $push: {
        participants: 'a' as Ref<Doc>
      }
    })
    const result = await resolveP
    expect(result.length).toEqual(2)
  })

  it('check query mixin projection', async () => {
    const { liveQuery, factory } = await getClient()

    let projects = await liveQuery.queryFind(test.mixin.TestProjectMixin, {}, { projection: { _id: 1 } })
    expect(projects.length).toEqual(0)
    const project = await factory.createDoc(test.class.TestProject, core.space.Space, {
      archived: false,
      description: '',
      members: [],
      private: false,
      prjName: 'test project',
      name: 'qwe'
    })

    projects = await liveQuery.queryFind(test.mixin.TestProjectMixin, {}, { projection: { _id: 1 } })
    expect(projects.length).toEqual(0)
    await factory.createMixin(project, test.class.TestProject, core.space.Space, test.mixin.TestProjectMixin, {
      someField: 'qwe'
    })
    // We need to process all events before we could do query again
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100)
    })
    projects = await liveQuery.queryFind(test.mixin.TestProjectMixin, {}, { projection: { _id: 1 } })
    expect(projects.length).toEqual(1)
  })

  jest.setTimeout(25000)
  it('test clone ops', async () => {
    const { liveQuery, factory } = await getClient()

    const counter = 1000
    const ctx = new MeasureMetricsContext('tool', {})
    let data: Space[] = []
    const pp = new Promise((resolve) => {
      liveQuery.query<Space>(
        test.class.TestProject,
        { private: false },
        (result) => {
          data = result
          if (data.length % 1000 === 0) {
            console.info(data.length)
          }
          if (data.length === counter) {
            resolve(null)
          }
        },
        {}
      )
    })

    for (let i = 0; i < counter; i++) {
      await ctx.with('create-doc', {}, () =>
        factory.createDoc(test.class.TestProject, core.space.Space, {
          archived: false,
          description: '',
          members: [],
          private: false,
          prjName: 'test project',
          name: 'qwe'
        })
      )
    }
    expect(data.length).toBe(counter)
    await pp
  })
})
