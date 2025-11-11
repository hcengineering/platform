//
// Copyright © 2024 Hardcore Engineering Inc.
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

import {
  makeCollabId,
  makeDocCollabId,
  makeCollabYdocId,
  makeCollabJsonId,
  type CollaborativeDoc
} from '../collaboration'
import type { Class, Doc, Ref } from '../classes'

describe('collaboration', () => {
  describe('makeCollabId', () => {
    it('should create collaborative doc id from parameters', () => {
      const objectClass = 'class:core.Doc' as Ref<Class<Doc>>
      const objectId = 'doc123' as Ref<Doc>
      const objectAttr = 'content'

      const result = makeCollabId(objectClass, objectId, objectAttr)

      expect(result).toEqual({
        objectClass,
        objectId,
        objectAttr
      })
    })

    it('should handle different attribute types', () => {
      const objectClass = 'class:task.Task' as Ref<Class<Doc>>
      const objectId = 'task456' as Ref<Doc>

      const result1 = makeCollabId(objectClass, objectId, 'description')
      const result2 = makeCollabId(objectClass, objectId, 'comments')

      expect(result1.objectAttr).toBe('description')
      expect(result2.objectAttr).toBe('comments')
    })

    it('should create unique ids for same object but different attributes', () => {
      const objectClass = 'class:core.Doc' as Ref<Class<Doc>>
      const objectId = 'doc123' as Ref<Doc>

      const result1 = makeCollabId(objectClass, objectId, 'attr1')
      const result2 = makeCollabId(objectClass, objectId, 'attr2')

      expect(result1.objectAttr).not.toBe(result2.objectAttr)
    })
  })

  describe('makeDocCollabId', () => {
    it('should create collaborative doc id from document', () => {
      const doc: Doc = {
        _id: 'doc789' as Ref<Doc>,
        _class: 'class:core.Doc' as Ref<Class<Doc>>,
        space: 'space1' as any,
        modifiedOn: 12345,
        modifiedBy: 'user1' as any
      }

      const result = makeDocCollabId(doc, 'content')

      expect(result).toEqual({
        objectClass: doc._class,
        objectId: doc._id,
        objectAttr: 'content'
      })
    })

    it('should work with typed attribute keys', () => {
      interface TestDoc extends Doc {
        title: string
        description: string
      }

      const doc: TestDoc = {
        _id: 'doc999' as Ref<TestDoc>,
        _class: 'class:test.TestDoc' as Ref<Class<TestDoc>>,
        space: 'space1' as any,
        modifiedOn: 12345,
        modifiedBy: 'user1' as any,
        title: 'Test',
        description: 'Description'
      }

      const result = makeDocCollabId(doc, 'description')

      expect(result.objectAttr).toBe('description')
    })

    it('should handle documents with complex ids', () => {
      const doc: Doc = {
        _id: 'space:task:project-1:task-123' as Ref<Doc>,
        _class: 'class:task.Task' as Ref<Class<Doc>>,
        space: 'space1' as any,
        modifiedOn: 12345,
        modifiedBy: 'user1' as any
      }

      const result = makeDocCollabId(doc, 'content')

      expect(result.objectId).toBe('space:task:project-1:task-123')
    })
  })

  describe('makeCollabYdocId', () => {
    it('should create ydoc id from collaborative doc', () => {
      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc123' as Ref<Doc>,
        objectAttr: 'content'
      }

      const result = makeCollabYdocId(collabDoc)

      expect(result).toBe('doc123%content')
    })

    it('should use % as separator', () => {
      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'myDoc' as Ref<Doc>,
        objectAttr: 'myAttr'
      }

      const result = makeCollabYdocId(collabDoc)

      expect(result).toContain('%')
      expect(result.split('%')).toHaveLength(2)
    })

    it('should create consistent ids', () => {
      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc456' as Ref<Doc>,
        objectAttr: 'field'
      }

      const result1 = makeCollabYdocId(collabDoc)
      const result2 = makeCollabYdocId(collabDoc)

      expect(result1).toBe(result2)
    })

    it('should create different ids for different attributes', () => {
      const collabDoc1: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc789' as Ref<Doc>,
        objectAttr: 'content'
      }

      const collabDoc2: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc789' as Ref<Doc>,
        objectAttr: 'description'
      }

      const result1 = makeCollabYdocId(collabDoc1)
      const result2 = makeCollabYdocId(collabDoc2)

      expect(result1).not.toBe(result2)
    })

    it('should handle special characters in ids', () => {
      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc:with:colons' as Ref<Doc>,
        objectAttr: 'attr-with-dash'
      }

      const result = makeCollabYdocId(collabDoc)

      expect(result).toBe('doc:with:colons%attr-with-dash')
    })
  })

  describe('makeCollabJsonId', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should create json id with timestamp', () => {
      const mockDate = new Date('2024-01-01T00:00:00.000Z')
      jest.setSystemTime(mockDate)

      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc123' as Ref<Doc>,
        objectAttr: 'content'
      }

      const result = makeCollabJsonId(collabDoc)

      expect(result).toBe(`doc123-content-${mockDate.getTime()}`)
    })

    it('should use - as separator', () => {
      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'myDoc' as Ref<Doc>,
        objectAttr: 'myAttr'
      }

      const result = makeCollabJsonId(collabDoc)

      const parts = result.split('-')
      expect(parts.length).toBeGreaterThanOrEqual(3)
      expect(parts[0]).toBe('myDoc')
      expect(parts[1]).toBe('myAttr')
    })

    it('should create different ids when called at different times', () => {
      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc456' as Ref<Doc>,
        objectAttr: 'field'
      }

      jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'))
      const result1 = makeCollabJsonId(collabDoc)

      jest.setSystemTime(new Date('2024-01-01T00:00:01.000Z'))
      const result2 = makeCollabJsonId(collabDoc)

      expect(result1).not.toBe(result2)
    })

    it('should include all three components', () => {
      const mockDate = new Date('2024-06-15T12:30:45.000Z')
      jest.setSystemTime(mockDate)

      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'testDoc' as Ref<Doc>,
        objectAttr: 'testAttr'
      }

      const result = makeCollabJsonId(collabDoc)

      expect(result).toContain('testDoc')
      expect(result).toContain('testAttr')
      expect(result).toContain(mockDate.getTime().toString())
    })

    it('should handle objects with ids containing dashes', () => {
      const mockDate = new Date('2024-01-01T00:00:00.000Z')
      jest.setSystemTime(mockDate)

      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc-with-dashes' as Ref<Doc>,
        objectAttr: 'attr-with-dashes'
      }

      const result = makeCollabJsonId(collabDoc)

      expect(result).toBe(`doc-with-dashes-attr-with-dashes-${mockDate.getTime()}`)
    })
  })

  describe('integration tests', () => {
    it('should create different types of ids from same collaborative doc', () => {
      const collabDoc: CollaborativeDoc = {
        objectClass: 'class:core.Doc' as Ref<Class<Doc>>,
        objectId: 'doc123' as Ref<Doc>,
        objectAttr: 'content'
      }

      const ydocId = makeCollabYdocId(collabDoc)
      const jsonId = makeCollabJsonId(collabDoc)

      expect(ydocId).not.toBe(jsonId)
      expect(ydocId).toContain(collabDoc.objectId)
      expect(jsonId).toContain(collabDoc.objectId)
    })

    it('should work with makeDocCollabId and other functions', () => {
      const doc: Doc = {
        _id: 'doc999' as Ref<Doc>,
        _class: 'class:core.Doc' as Ref<Class<Doc>>,
        space: 'space1' as any,
        modifiedOn: 12345,
        modifiedBy: 'user1' as any
      }

      const collabDoc = makeDocCollabId(doc, 'content')
      const ydocId = makeCollabYdocId(collabDoc)
      const jsonId = makeCollabJsonId(collabDoc)

      expect(ydocId).toContain('doc999')
      expect(jsonId).toContain('doc999')
    })
  })
})
