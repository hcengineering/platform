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

import { getClassCollaborators } from '../collaborators'
import { ModelDb } from '../memdb'
import { Hierarchy } from '../hierarchy'
import core from '../component'
import type { Class, ClassCollaborators, Doc, Ref } from '../classes'

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
})
