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

import { getClassCollaborators, resolveMentionGrantTarget } from '../collaborators'
import { ModelDb } from '../memdb'
import { Hierarchy } from '../hierarchy'
import core from '../component'
import type { AttachedDoc, Class, ClassCollaborators, Doc, Ref } from '../classes'

describe('collaborators', () => {
  let model: ModelDb
  let hierarchy: Hierarchy

  beforeEach(() => {
    model = new ModelDb(hierarchy)
    hierarchy = new Hierarchy()
  })

  describe('getClassCollaborators', () => {
    it('should return undefined when no collaborators found', () => {
      const classRef = 'class:test.TestClass' as Ref<Class<Doc>>

      // Mock hierarchy to return empty ancestors
      hierarchy.getAncestors = jest.fn().mockReturnValue([classRef])

      // Mock model to return empty result
      model.findAllSync = jest.fn().mockReturnValue([])

      const result = getClassCollaborators(model, hierarchy, classRef)

      expect(result).toBeUndefined()
    })

    it('should return collaborators for direct class', () => {
      const classRef = 'class:test.TestClass' as Ref<Class<Doc>>
      const collaborators: ClassCollaborators<Doc> = {
        _id: 'collab1' as any,
        _class: core.class.ClassCollaborators,
        space: 'space1' as any,
        modifiedOn: Date.now(),
        modifiedBy: 'user1' as any,
        attachedTo: classRef,
        attachedToClass: core.class.Class,
        collection: 'collaborators'
      } as unknown as ClassCollaborators<Doc>

      hierarchy.getAncestors = jest.fn().mockReturnValue([classRef])
      model.findAllSync = jest.fn().mockReturnValue([collaborators])

      const result = getClassCollaborators(model, hierarchy, classRef)

      expect(result).toBe(collaborators)
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(model.findAllSync).toHaveBeenCalledWith(core.class.ClassCollaborators, { attachedTo: { $in: [classRef] } })
    })

    it('should return collaborators from ancestor class', () => {
      const childClass = 'class:test.ChildClass' as Ref<Class<Doc>>
      const parentClass = 'class:test.ParentClass' as Ref<Class<Doc>>
      const grandParentClass = core.class.Doc

      const parentCollaborators: ClassCollaborators<Doc> = {
        _id: 'collab2' as any,
        _class: core.class.ClassCollaborators,
        space: 'space1' as any,
        modifiedOn: Date.now(),
        modifiedBy: 'user1' as any,
        attachedTo: parentClass,
        attachedToClass: core.class.Class,
        collection: 'collaborators'
      } as unknown as ClassCollaborators<Doc>

      hierarchy.getAncestors = jest.fn().mockReturnValue([childClass, parentClass, grandParentClass])
      model.findAllSync = jest.fn().mockReturnValue([parentCollaborators])

      const result = getClassCollaborators(model, hierarchy, childClass)

      expect(result).toBe(parentCollaborators)
    })

    it('should return first matching ancestor collaborators', () => {
      const childClass = 'class:test.ChildClass' as Ref<Class<Doc>>
      const parentClass = 'class:test.ParentClass' as Ref<Class<Doc>>
      const grandParentClass = 'class:test.GrandParentClass' as Ref<Class<Doc>>

      const parentCollaborators: ClassCollaborators<Doc> = {
        _id: 'collab3' as any,
        _class: core.class.ClassCollaborators,
        space: 'space1' as any,
        modifiedOn: Date.now(),
        modifiedBy: 'user1' as any,
        attachedTo: parentClass,
        attachedToClass: core.class.Class,
        collection: 'collaborators'
      } as unknown as ClassCollaborators<Doc>

      const grandParentCollaborators: ClassCollaborators<Doc> = {
        _id: 'collab4' as any,
        _class: core.class.ClassCollaborators,
        space: 'space1' as any,
        modifiedOn: Date.now(),
        modifiedBy: 'user1' as any,
        attachedTo: grandParentClass,
        attachedToClass: core.class.Class,
        collection: 'collaborators'
      } as unknown as ClassCollaborators<Doc>

      hierarchy.getAncestors = jest.fn().mockReturnValue([childClass, parentClass, grandParentClass])
      model.findAllSync = jest.fn().mockReturnValue([parentCollaborators, grandParentCollaborators])

      const result = getClassCollaborators(model, hierarchy, childClass)

      // Should return parent collaborators (first in ancestor chain)
      expect(result).toBe(parentCollaborators)
    })

    it('should handle single class with no ancestors', () => {
      const classRef = core.class.Doc

      hierarchy.getAncestors = jest.fn().mockReturnValue([classRef])
      model.findAllSync = jest.fn().mockReturnValue([])

      const result = getClassCollaborators(model, hierarchy, classRef)

      expect(result).toBeUndefined()
    })

    it('should handle empty ancestors list', () => {
      const classRef = 'class:test.TestClass' as Ref<Class<Doc>>

      hierarchy.getAncestors = jest.fn().mockReturnValue([])
      model.findAllSync = jest.fn().mockReturnValue([])

      const result = getClassCollaborators(model, hierarchy, classRef)

      expect(result).toBeUndefined()
    })

    it('should properly query model with $in operator', () => {
      const childClass = 'class:test.ChildClass' as Ref<Class<Doc>>
      const parentClass = 'class:test.ParentClass' as Ref<Class<Doc>>
      const ancestors = [childClass, parentClass, core.class.Doc]

      hierarchy.getAncestors = jest.fn().mockReturnValue(ancestors)
      model.findAllSync = jest.fn().mockReturnValue([])

      getClassCollaborators(model, hierarchy, childClass)

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(model.findAllSync).toHaveBeenCalledWith(core.class.ClassCollaborators, { attachedTo: { $in: ancestors } })
    })

    it('should iterate through ancestors in order', () => {
      const class1 = 'class:test.Class1' as Ref<Class<Doc>>
      const class2 = 'class:test.Class2' as Ref<Class<Doc>>
      const class3 = 'class:test.Class3' as Ref<Class<Doc>>

      const collab2: ClassCollaborators<Doc> = {
        _id: 'collab5' as any,
        _class: core.class.ClassCollaborators,
        space: 'space1' as any,
        modifiedOn: Date.now(),
        modifiedBy: 'user1' as any,
        attachedTo: class2,
        attachedToClass: core.class.Class,
        collection: 'collaborators'
      } as unknown as ClassCollaborators<Doc>

      const collab3: ClassCollaborators<Doc> = {
        _id: 'collab6' as any,
        _class: core.class.ClassCollaborators,
        space: 'space1' as any,
        modifiedOn: Date.now(),
        modifiedBy: 'user1' as any,
        attachedTo: class3,
        attachedToClass: core.class.Class,
        collection: 'collaborators'
      } as unknown as ClassCollaborators<Doc>

      hierarchy.getAncestors = jest.fn().mockReturnValue([class1, class2, class3])
      model.findAllSync = jest.fn().mockReturnValue([collab2, collab3])

      const result = getClassCollaborators(model, hierarchy, class1)

      // Should return collab2 (class2 comes before class3 in ancestors)
      expect(result).toBe(collab2)
    })
  })

  describe('resolveMentionGrantTarget', () => {
    const ISSUE = 'tracker:class:Issue' as Ref<Class<Doc>>
    const THREAD = 'chunter:class:ThreadMessage' as Ref<Class<Doc>>
    const MSG = 'chunter:class:ChatMessage' as Ref<Class<Doc>>

    // Builds a findAll injector like the server/client pass in. `opted` is the
    // set of _class refs whose ClassCollaborators is provideSecurity+mentionsGrantAccess.
    // `docs` maps _id -> Doc for the attachedTo parent lookups.
    function makeFindAll (
      opted: Set<string>,
      docs: Record<string, Doc>
    ): jest.Mock<Promise<any[]>, [Ref<Class<Doc>>, any, any?]> {
      return jest.fn(async (cls: Ref<Class<Doc>>, q: any, _options?: any) => {
        if (cls === core.class.ClassCollaborators) {
          const target = q.attachedTo as string
          return opted.has(target) ? [{ provideSecurity: true, mentionsGrantAccess: true }] : []
        }
        const doc = docs[q._id as string]
        return doc != null ? [doc] : []
      })
    }

    it('returns the start doc when it is itself opted in', async () => {
      const start: Doc = { _id: 'i1' as Ref<Doc>, _class: ISSUE } as unknown as Doc
      const findAll = makeFindAll(new Set([ISSUE]), {})

      const result = await resolveMentionGrantTarget(start, findAll)

      expect(result).toBe(start)
    })

    it('walks the attachedTo chain to the first opted-in ancestor', async () => {
      const issue: Doc = { _id: 'i1' as Ref<Doc>, _class: ISSUE } as unknown as Doc
      const thread = {
        _id: 'tm1' as Ref<Doc>,
        _class: THREAD,
        attachedTo: 'i1' as Ref<Doc>,
        attachedToClass: ISSUE
      } as unknown as AttachedDoc

      // ThreadMessage + ChatMessage are NOT opted in; only the Issue ancestor is.
      const findAll = makeFindAll(new Set([ISSUE]), { i1: issue })

      const result = await resolveMentionGrantTarget(thread, findAll)

      expect(result).toBe(issue)
    })

    it('returns null when nothing in the chain is opted in', async () => {
      const parent = { _id: 'p1' as Ref<Doc>, _class: MSG } as unknown as Doc
      const child = {
        _id: 'c1' as Ref<Doc>,
        _class: THREAD,
        attachedTo: 'p1' as Ref<Doc>,
        attachedToClass: MSG
      } as unknown as AttachedDoc

      const findAll = makeFindAll(new Set(), { p1: parent })

      const result = await resolveMentionGrantTarget(child, findAll)

      expect(result).toBeNull()
    })

    it('returns null on an attachedTo cycle (depth cap 8)', async () => {
      // Self-referential doc: attachedTo points back at itself, never opted in.
      const node = {
        _id: 'x' as Ref<Doc>,
        _class: THREAD,
        attachedTo: 'x' as Ref<Doc>,
        attachedToClass: THREAD
      } as unknown as AttachedDoc
      const findAll = makeFindAll(new Set(), { x: node as unknown as Doc })

      const result = await resolveMentionGrantTarget(node, findAll)

      expect(result).toBeNull()
      // Depth cap 8: exactly 8 ClassCollaborators probes (one per loop turn).
      const ccProbes = findAll.mock.calls.filter((c) => c[0] === core.class.ClassCollaborators)
      expect(ccProbes.length).toBe(8)
    })

    it('passes { limit: 1 } as the third arg on every findAll lookup (fix guard)', async () => {
      const issue: Doc = { _id: 'i1' as Ref<Doc>, _class: ISSUE } as unknown as Doc
      const thread = {
        _id: 'tm1' as Ref<Doc>,
        _class: THREAD,
        attachedTo: 'i1' as Ref<Doc>,
        attachedToClass: ISSUE
      } as unknown as AttachedDoc
      const findAll = makeFindAll(new Set([ISSUE]), { i1: issue })

      await resolveMentionGrantTarget(thread, findAll)

      // Both the ClassCollaborators probe and the parent lookup must be bounded.
      expect(findAll).toHaveBeenCalled()
      for (const call of findAll.mock.calls) {
        expect(call[2]).toEqual({ limit: 1 })
      }
      // Sanity: at least one ClassCollaborators probe and one parent lookup ran.
      expect(findAll.mock.calls.some((c) => c[0] === core.class.ClassCollaborators)).toBe(true)
      expect(findAll.mock.calls.some((c) => c[0] === ISSUE)).toBe(true)
    })
  })
})
