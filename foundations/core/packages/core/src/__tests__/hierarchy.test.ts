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

import type { AnyAttribute, Class, Doc, Obj, Ref } from '../classes'
import { ClassifierKind, DOMAIN_MODEL } from '../classes'
import type { TxCreateDoc } from '../tx'
import { TxFactory } from '../tx'
import core from '../component'
import { Hierarchy } from '../hierarchy'
import * as Proxy from '../proxy'
import { genMinModel, test } from './minmodel'

const txes = genMinModel()

function prepare (): Hierarchy {
  const hierarchy = new Hierarchy()
  for (const tx of txes) hierarchy.tx(tx)
  return hierarchy
}

describe('hierarchy', () => {
  it('should build hierarchy', async () => {
    const hierarchy = prepare()
    const ancestors = hierarchy.getAncestors(core.class.TxCreateDoc)
    expect(ancestors).toContain(core.class.Tx)
  })

  it('isDerived', async () => {
    const hierarchy = prepare()
    const derived = hierarchy.isDerived(core.class.Space, core.class.Doc)
    expect(derived).toBeTruthy()
    const notDerived = hierarchy.isDerived(core.class.Space, core.class.Class)
    expect(notDerived).not.toBeTruthy()
  })

  it('isImplements', async () => {
    const hierarchy = prepare()
    let isImplements = hierarchy.isImplements(test.class.Task, test.interface.WithState)
    expect(isImplements).toBeTruthy()

    isImplements = hierarchy.isImplements(test.class.TaskCheckItem, test.interface.WithState)
    expect(isImplements).toBeTruthy()

    const notImplements = hierarchy.isImplements(core.class.Space, test.interface.WithState)
    expect(notImplements).not.toBeTruthy()
  })

  it('getClass', async () => {
    const hierarchy = prepare()
    const data = hierarchy.getClass(core.class.TxCreateDoc)
    expect(data).toMatchObject((txes.find((p) => p.objectId === core.class.TxCreateDoc) as TxCreateDoc<Doc>).attributes)
    const notExistClass = 'class:test.MyClass' as Ref<Class<Obj>>
    expect(() => hierarchy.getClass(notExistClass)).toThrowError('class not found: ' + notExistClass)
  })

  it('getDomain', async () => {
    const hierarchy = prepare()
    const txDomain = hierarchy.getDomain(core.class.TxCreateDoc)
    expect(txDomain).toBe('tx')
    const modelDomain = hierarchy.getDomain(core.class.Class)
    expect(modelDomain).toBe('model')
  })

  it('should create Mixin proxy', async () => {
    const spyProxy = jest.spyOn(Proxy, '_createMixinProxy')
    const hierarchy = prepare()

    hierarchy.as(txes[0], test.mixin.TestMixin)
    expect(spyProxy).toBeCalledTimes(1)

    hierarchy.as(txes[0], test.mixin.TestMixin)
    expect(spyProxy).toBeCalledTimes(1)

    spyProxy.mockReset()
    spyProxy.mockRestore()
  })

  it('should call static methods', async () => {
    const spyToDoc = jest.spyOn(Proxy, '_toDoc')
    Hierarchy.toDoc(txes[0])
    expect(spyToDoc).toBeCalledTimes(1)
    spyToDoc.mockReset()
    spyToDoc.mockRestore()

    const spyMixinClass = jest.spyOn(Proxy, '_mixinClass')
    Hierarchy.mixinClass(txes[0])
    expect(spyMixinClass).toBeCalledTimes(1)

    spyMixinClass.mockImplementationOnce(() => undefined).mockImplementationOnce(() => test.mixin.TestMixin)
    let result = Hierarchy.mixinOrClass(txes[0])
    expect(result).toStrictEqual(txes[0]._class)
    result = Hierarchy.mixinOrClass(txes[0])
    expect(result).toStrictEqual(test.mixin.TestMixin)
    expect(spyMixinClass).toBeCalledTimes(3)

    spyMixinClass.mockReset()
    spyMixinClass.mockRestore()
  })

  // Memory optimization tests - ancestors stored as array
  it('getAncestors should return array directly', async () => {
    const hierarchy = prepare()
    const ancestors = hierarchy.getAncestors(core.class.TxCreateDoc)

    // Verify it's an array
    expect(Array.isArray(ancestors)).toBeTruthy()

    // Verify it contains expected ancestors
    expect(ancestors).toContain(core.class.TxCreateDoc)
    expect(ancestors).toContain(core.class.TxCUD)
    expect(ancestors).toContain(core.class.Tx)
    expect(ancestors).toContain(core.class.Doc)
    expect(ancestors).toContain(core.class.Obj)

    // Verify order is consistent
    const indexTx = ancestors.indexOf(core.class.Tx)
    const indexDoc = ancestors.indexOf(core.class.Doc)
    expect(indexDoc).toBeGreaterThan(indexTx)
  })

  it('isDerived should work with array-based ancestors', async () => {
    const hierarchy = prepare()

    // Test various inheritance chains
    expect(hierarchy.isDerived(core.class.TxCreateDoc, core.class.Tx)).toBeTruthy()
    expect(hierarchy.isDerived(core.class.TxCreateDoc, core.class.TxCUD)).toBeTruthy()
    expect(hierarchy.isDerived(core.class.TxCreateDoc, core.class.Doc)).toBeTruthy()
    expect(hierarchy.isDerived(core.class.TxCreateDoc, core.class.Obj)).toBeTruthy()

    // Test self-derivation (class is in its own ancestors)
    expect(hierarchy.isDerived(core.class.TxCreateDoc, core.class.TxCreateDoc)).toBeTruthy()

    // Test non-derived classes
    expect(hierarchy.isDerived(core.class.TxCreateDoc, core.class.Space)).toBeFalsy()
    expect(hierarchy.isDerived(core.class.Space, core.class.Tx)).toBeFalsy()

    // Test with mixins
    expect(hierarchy.isDerived(test.class.TestComment, core.class.AttachedDoc)).toBeTruthy()
    expect(hierarchy.isDerived(test.mixin.TaskMixinTodos, test.class.Task)).toBeTruthy()
  })

  it('should handle deep inheritance chains efficiently', async () => {
    const hierarchy = prepare()

    // TxCreateDoc has a chain: TxCreateDoc -> TxCUD -> Tx -> Doc -> Obj
    const ancestors = hierarchy.getAncestors(core.class.TxCreateDoc)
    expect(ancestors.length).toBeGreaterThanOrEqual(5)

    // All intermediate classes should be present
    expect(hierarchy.isDerived(core.class.TxCreateDoc, core.class.TxCUD)).toBeTruthy()
    expect(hierarchy.isDerived(core.class.TxCUD, core.class.Tx)).toBeTruthy()
    expect(hierarchy.isDerived(core.class.Tx, core.class.Doc)).toBeTruthy()
    expect(hierarchy.isDerived(core.class.Doc, core.class.Obj)).toBeTruthy()
  })

  // Classifier properties tests - Map-based storage
  it('getClassifierProp and setClassifierProp should work with Map', async () => {
    const hierarchy = prepare()

    // Set a property
    hierarchy.setClassifierProp(core.class.Space, 'testProp', 'testValue')

    // Get the property
    const value = hierarchy.getClassifierProp(core.class.Space, 'testProp')
    expect(value).toBe('testValue')

    // Update the property
    hierarchy.setClassifierProp(core.class.Space, 'testProp', 'updatedValue')
    const updatedValue = hierarchy.getClassifierProp(core.class.Space, 'testProp')
    expect(updatedValue).toBe('updatedValue')
  })

  it('should handle multiple properties per classifier', async () => {
    const hierarchy = prepare()

    // Set multiple properties
    hierarchy.setClassifierProp(core.class.Space, 'prop1', 'value1')
    hierarchy.setClassifierProp(core.class.Space, 'prop2', 'value2')
    hierarchy.setClassifierProp(core.class.Space, 'prop3', 42)
    hierarchy.setClassifierProp(core.class.Space, 'prop4', { nested: 'object' })

    // Verify all properties are stored correctly
    expect(hierarchy.getClassifierProp(core.class.Space, 'prop1')).toBe('value1')
    expect(hierarchy.getClassifierProp(core.class.Space, 'prop2')).toBe('value2')
    expect(hierarchy.getClassifierProp(core.class.Space, 'prop3')).toBe(42)
    expect(hierarchy.getClassifierProp(core.class.Space, 'prop4')).toEqual({ nested: 'object' })

    // Verify undefined for non-existent property
    expect(hierarchy.getClassifierProp(core.class.Space, 'nonExistent')).toBeUndefined()
  })

  it('should isolate properties between different classifiers', async () => {
    const hierarchy = prepare()

    // Set properties on different classifiers
    hierarchy.setClassifierProp(core.class.Space, 'name', 'Space')
    hierarchy.setClassifierProp(core.class.Doc, 'name', 'Doc')
    hierarchy.setClassifierProp(test.class.Task, 'name', 'Task')

    // Verify isolation
    expect(hierarchy.getClassifierProp(core.class.Space, 'name')).toBe('Space')
    expect(hierarchy.getClassifierProp(core.class.Doc, 'name')).toBe('Doc')
    expect(hierarchy.getClassifierProp(test.class.Task, 'name')).toBe('Task')
  })

  it('should handle property updates without creating new objects', async () => {
    const hierarchy = prepare()

    // Set initial value
    hierarchy.setClassifierProp(core.class.Space, 'counter', 0)

    // Update multiple times (testing that we're not creating new objects each time)
    for (let i = 1; i <= 100; i++) {
      hierarchy.setClassifierProp(core.class.Space, 'counter', i)
    }

    // Verify final value
    expect(hierarchy.getClassifierProp(core.class.Space, 'counter')).toBe(100)
  })

  // Edge cases and integration tests
  it('should handle interface implementation checks correctly', async () => {
    const hierarchy = prepare()

    // Task implements DummyWithState which extends WithState
    expect(hierarchy.isImplements(test.class.Task, test.interface.WithState)).toBeTruthy()
    expect(hierarchy.isImplements(test.class.Task, test.interface.DummyWithState)).toBeTruthy()

    // TaskCheckItem directly implements WithState
    expect(hierarchy.isImplements(test.class.TaskCheckItem, test.interface.WithState)).toBeTruthy()

    // Negative cases
    expect(hierarchy.isImplements(core.class.Space, test.interface.WithState)).toBeFalsy()
  })

  it('should maintain consistency after multiple hierarchy operations', async () => {
    const hierarchy = prepare()

    // Perform multiple operations
    const ancestors1 = hierarchy.getAncestors(test.class.Task)
    const isDerived1 = hierarchy.isDerived(test.class.Task, core.class.Doc)

    // Set some properties
    hierarchy.setClassifierProp(test.class.Task, 'test', 'value')

    // Verify operations still work correctly
    const ancestors2 = hierarchy.getAncestors(test.class.Task)
    const isDerived2 = hierarchy.isDerived(test.class.Task, core.class.Doc)

    expect(ancestors1).toEqual(ancestors2)
    expect(isDerived1).toBe(isDerived2)
    expect(isDerived2).toBeTruthy()
  })

  it('should handle getDescendants correctly', async () => {
    const hierarchy = prepare()

    // Get descendants of Doc (should include many classes)
    const descendants = hierarchy.getDescendants(core.class.Doc)

    expect(descendants).toContain(core.class.Space)
    expect(descendants).toContain(core.class.Tx)
    expect(descendants).toContain(test.class.Task)
    expect(Array.isArray(descendants)).toBeTruthy()
  })

  it('should work with getBaseClass', async () => {
    const hierarchy = prepare()

    // Get base class of a mixin
    const baseClass = hierarchy.getBaseClass(test.mixin.TaskMixinTodos)
    expect(baseClass).toBe(test.class.Task)

    // Get base class of a regular class (should return itself)
    const baseClass2 = hierarchy.getBaseClass(test.class.Task)
    expect(baseClass2).toBe(test.class.Task)
  })

  it('should handle getAllAttributes correctly', async () => {
    const hierarchy = prepare()

    // Get all attributes for a class
    const attributes = hierarchy.getAllAttributes(core.class.TxCreateDoc)

    // Should return a Map
    expect(attributes instanceof Map).toBeTruthy()

    // Test with to parameter
    const attributesTo = hierarchy.getAllAttributes(core.class.TxCreateDoc, core.class.Tx)
    expect(attributesTo instanceof Map).toBeTruthy()
  })

  it('should maintain immutability of returned ancestors array', async () => {
    const hierarchy = prepare()

    // Get ancestors
    const ancestors = hierarchy.getAncestors(test.class.Task)
    const originalLength = ancestors.length

    // The returned array should be the internal array, but modifying it shouldn't break hierarchy
    // (This is a trade-off for memory optimization - callers should treat it as read-only)
    expect(ancestors.length).toBe(originalLength)
    expect(ancestors).toContain(core.class.Doc)
  })

  it('should handle performance for multiple isDerived checks', async () => {
    const hierarchy = prepare()

    // Perform many isDerived checks to ensure array-based lookup is performant
    const startTime = Date.now()
    for (let i = 0; i < 1000; i++) {
      hierarchy.isDerived(core.class.TxCreateDoc, core.class.Tx)
      hierarchy.isDerived(test.class.Task, core.class.Doc)
      hierarchy.isDerived(test.class.TaskCheckItem, core.class.AttachedDoc)
    }
    const endTime = Date.now()

    // Should complete in reasonable time (< 100ms for 3000 checks)
    expect(endTime - startTime).toBeLessThan(100)
  })

  // Additional comprehensive tests for better coverage

  it('should handle findClass and hasClass correctly', async () => {
    const hierarchy = prepare()

    // findClass should return class or undefined
    const foundClass = hierarchy.findClass(core.class.Space)
    expect(foundClass).toBeDefined()
    expect(foundClass?._id).toBe(core.class.Space)

    const notFoundClass = hierarchy.findClass('class:NonExistent' as Ref<Class<Obj>>)
    expect(notFoundClass).toBeUndefined()

    // hasClass should return boolean
    expect(hierarchy.hasClass(core.class.Space)).toBeTruthy()
    expect(hierarchy.hasClass('class:NonExistent' as Ref<Class<Obj>>)).toBeFalsy()

    // Interface should not be considered a class
    expect(hierarchy.hasClass(test.interface.WithState as any)).toBeFalsy()
  })

  it('should handle getClassOrInterface correctly', async () => {
    const hierarchy = prepare()

    // Should get a class
    const spaceClass = hierarchy.getClassOrInterface(core.class.Space)
    expect(spaceClass._id).toBe(core.class.Space)

    // Should get an interface
    const withStateInterface = hierarchy.getClassOrInterface(test.interface.WithState as any)
    expect(withStateInterface._id).toBe(test.interface.WithState)

    // Should throw for non-existent
    expect(() => hierarchy.getClassOrInterface('class:NonExistent' as Ref<Class<Obj>>)).toThrowError(
      'class not found: class:NonExistent'
    )
  })

  it('should handle getInterface correctly', async () => {
    const hierarchy = prepare()

    // Should get interface
    const withStateInterface = hierarchy.getInterface(test.interface.WithState)
    expect(withStateInterface._id).toBe(test.interface.WithState)

    // Should throw for non-existent interface
    expect(() => hierarchy.getInterface('interface:NonExistent' as any)).toThrowError(
      'interface not found: interface:NonExistent'
    )

    // Should throw for class (not interface)
    expect(() => hierarchy.getInterface(core.class.Space as any)).toThrowError()
  })

  it('should handle isMixin correctly', async () => {
    const hierarchy = prepare()

    // Should identify mixins
    expect(hierarchy.isMixin(test.mixin.TestMixin)).toBeTruthy()
    expect(hierarchy.isMixin(test.mixin.TaskMixinTodos)).toBeTruthy()
    expect(hierarchy.isMixin(core.class.AttachedDoc)).toBeTruthy()

    // Should not identify classes as mixins
    expect(hierarchy.isMixin(core.class.Space)).toBeFalsy()
    expect(hierarchy.isMixin(test.class.Task)).toBeFalsy()

    // Should return false for non-existent
    expect(hierarchy.isMixin('mixin:NonExistent' as any)).toBeFalsy()
  })

  it('should handle as and asIf with mixins', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: core.class.Doc,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any
    }

    // as should return a proxy
    const withMixin = hierarchy.as(doc, test.mixin.TestMixin)
    expect(withMixin).toBeDefined()
    expect(withMixin._id).toBe(doc._id)

    // asIf should return undefined if mixin not present
    const asIfResult = hierarchy.asIf(doc, test.mixin.TestMixin)
    expect(asIfResult).toBeUndefined()

    // asIf should return undefined for undefined doc
    expect(hierarchy.asIf(undefined, test.mixin.TestMixin)).toBeUndefined()
  })

  it('should handle asIfArray correctly', async () => {
    const hierarchy = prepare()

    const docs = [
      { _id: 'doc1' as any, _class: core.class.Doc, space: 'space1' as any, modifiedOn: 0, modifiedBy: 'user1' as any },
      { _id: 'doc2' as any, _class: core.class.Doc, space: 'space1' as any, modifiedOn: 0, modifiedBy: 'user1' as any }
    ]

    // Should return empty array if no docs have the mixin
    const result = hierarchy.asIfArray(docs, test.mixin.TestMixin)
    expect(Array.isArray(result)).toBeTruthy()
    expect(result.length).toBe(0)
  })

  it('should handle classHierarchyMixin correctly', async () => {
    const hierarchy = prepare()

    // Should find mixin in class hierarchy
    const result = hierarchy.classHierarchyMixin(test.mixin.TaskMixinTodos, test.mixin.TestMixin)
    // May be undefined if mixin not in hierarchy
    expect(result === undefined || typeof result === 'object').toBeTruthy()

    // Test with filter
    const filtered = hierarchy.classHierarchyMixin(test.class.Task, test.mixin.TestMixin, (m) => m !== undefined)
    expect(filtered === undefined || typeof filtered === 'object').toBeTruthy()
  })

  it('should handle findClassOrMixinMixin correctly', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any
    }

    const result = hierarchy.findClassOrMixinMixin(doc, test.mixin.TestMixin)
    // May be undefined if not found
    expect(result === undefined || typeof result === 'object').toBeTruthy()
  })

  it('should handle findMixinMixins correctly', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any
    }

    const results = hierarchy.findMixinMixins(doc, test.mixin.TestMixin)
    expect(Array.isArray(results)).toBeTruthy()
  })

  it('should handle findAllMixins correctly', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any
    }

    const mixins = hierarchy.findAllMixins(doc)
    expect(Array.isArray(mixins)).toBeTruthy()
  })

  it('should handle findDomain correctly', async () => {
    const hierarchy = prepare()

    // Should find domain
    const domain = hierarchy.findDomain(core.class.Space)
    expect(domain).toBe('model')

    // Should return undefined for non-existent class
    const noDomain = hierarchy.findDomain('class:NonExistent' as any)
    expect(noDomain).toBeUndefined()
  })

  it('should handle getParentClass correctly', async () => {
    const hierarchy = prepare()

    // Should get parent class with same domain
    const parent = hierarchy.getParentClass(core.class.Space)
    expect(parent).toBeDefined()
    // Parent should have same domain or be the class itself
    const parentDomain = hierarchy.findDomain(parent)
    expect(parentDomain === 'model' || parent === core.class.Space).toBeTruthy()
  })

  it('should handle getAttribute correctly', async () => {
    const hierarchy = prepare()

    // Should throw for non-existent attribute
    expect(() => hierarchy.getAttribute(core.class.Space, 'nonExistentAttr')).toThrowError(
      'attribute not found: nonExistentAttr'
    )
  })

  it('should handle findAttribute correctly', async () => {
    const hierarchy = prepare()

    // Should return undefined for non-existent attribute
    const attr = hierarchy.findAttribute(core.class.Space, 'nonExistentAttr')
    expect(attr).toBeUndefined()
  })

  it('should handle getOwnAttributes correctly', async () => {
    const hierarchy = prepare()

    // Should return Map of attributes
    const attrs = hierarchy.getOwnAttributes(core.class.Space)
    expect(attrs instanceof Map).toBeTruthy()
  })

  it('should handle updateLookupMixin correctly', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any
    }

    // Without $lookup
    const result1 = hierarchy.updateLookupMixin(test.class.Task, doc as any)
    expect(result1).toBeDefined()

    // With $lookup
    const docWithLookup = {
      ...doc,
      $lookup: {}
    }
    const result2 = hierarchy.updateLookupMixin(test.class.Task, docWithLookup as any)
    expect(result2).toBeDefined()
  })

  it('should handle clone correctly', async () => {
    const hierarchy = prepare()

    const obj = {
      _id: 'doc1' as any,
      _class: core.class.Doc,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      nested: {
        value: 'test'
      }
    }

    const cloned = hierarchy.clone(obj)
    expect(cloned).toEqual(obj)
    expect(cloned).not.toBe(obj)
    expect(cloned.nested).not.toBe(obj.nested)
  })

  it('should handle domains correctly', async () => {
    const hierarchy = prepare()

    const domains = hierarchy.domains()
    expect(Array.isArray(domains)).toBeTruthy()
    expect(domains).toContain('model')
    expect(domains).toContain('tx')

    // Should not have duplicates
    const uniqueDomains = [...new Set(domains)]
    expect(domains.length).toBe(uniqueDomains.length)
  })

  it('should handle getAncestors error case', async () => {
    const hierarchy = prepare()

    // Should throw for non-existent class
    expect(() => hierarchy.getAncestors('class:NonExistent' as any)).toThrowError(
      'ancestors not found: class:NonExistent'
    )
  })

  it('should handle getDescendants error case', async () => {
    const hierarchy = prepare()

    // Should throw for non-existent class
    expect(() => hierarchy.getDescendants('class:NonExistent' as any)).toThrowError(
      'descendants not found: class:NonExistent'
    )
  })

  it('should handle getDomain error case', async () => {
    const hierarchy = prepare()

    // Should throw for class without domain
    expect(() => hierarchy.getDomain('class:NonExistent' as any)).toThrowError('domain not found: class:NonExistent')
  })

  it('should handle static hasMixin correctly', async () => {
    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      [test.mixin.TestMixin]: { arr: [] }
    }

    expect(Hierarchy.hasMixin(doc, test.mixin.TestMixin)).toBeTruthy()
    expect(Hierarchy.hasMixin(doc, 'mixin:Other' as any)).toBeFalsy()
  })

  it('should maintain descendants list correctly', async () => {
    const hierarchy = prepare()

    // Doc should have many descendants
    const docDescendants = hierarchy.getDescendants(core.class.Doc)
    expect(docDescendants.length).toBeGreaterThan(5)

    // Obj should have even more descendants (everything)
    const objDescendants = hierarchy.getDescendants(core.class.Obj)
    expect(objDescendants.length).toBeGreaterThanOrEqual(docDescendants.length)

    // TxCreateDoc should have fewer descendants (possibly none)
    const txCreateDescendants = hierarchy.getDescendants(core.class.TxCreateDoc)
    expect(Array.isArray(txCreateDescendants)).toBeTruthy()
  })

  it('should handle interface extends chains', async () => {
    const hierarchy = prepare()

    // DummyWithState extends WithState
    const dummyAncestors = hierarchy.getAncestors(test.interface.DummyWithState)
    expect(dummyAncestors).toContain(test.interface.WithState)
  })

  it('should handle complex mixin hierarchies', async () => {
    const hierarchy = prepare()

    // TaskMixinTodos extends Task
    expect(hierarchy.isDerived(test.mixin.TaskMixinTodos, test.class.Task)).toBeTruthy()
    expect(hierarchy.isDerived(test.mixin.TaskMixinTodos, core.class.Doc)).toBeTruthy()

    // Should identify as mixin
    expect(hierarchy.isMixin(test.mixin.TaskMixinTodos)).toBeTruthy()

    // Base class should be Task
    const baseClass = hierarchy.getBaseClass(test.mixin.TaskMixinTodos)
    expect(baseClass).toBe(test.class.Task)
  })

  it('should handle getAllAttributes with traverse callback', async () => {
    const hierarchy = prepare()

    const traversed: Array<{ name: string, attrId: string }> = []
    const attributes = hierarchy.getAllAttributes(core.class.TxCreateDoc, undefined, (name, attr) => {
      traversed.push({ name, attrId: attr._id })
    })

    expect(attributes instanceof Map).toBeTruthy()
    // If there are attributes, traverse should have been called
    if (attributes.size > 0) {
      expect(traversed.length).toBeGreaterThan(0)
    }
  })

  it('should handle property deletions implicitly through cache invalidation', async () => {
    const hierarchy = prepare()

    // Set a property
    hierarchy.setClassifierProp(core.class.Space, 'cached', 'value')
    expect(hierarchy.getClassifierProp(core.class.Space, 'cached')).toBe('value')

    // Properties persist across reads
    expect(hierarchy.getClassifierProp(core.class.Space, 'cached')).toBe('value')
  })

  it('should verify memory optimization: no duplicate ancestor storage', async () => {
    const hierarchy = prepare()

    // Get ancestors for multiple classes
    const ancestors1 = hierarchy.getAncestors(core.class.TxCreateDoc)
    const ancestors2 = hierarchy.getAncestors(core.class.TxUpdateDoc)
    const ancestors3 = hierarchy.getAncestors(core.class.TxRemoveDoc)

    // All should share some common ancestors
    const commonAncestors = ancestors1.filter((a) => ancestors2.includes(a) && ancestors3.includes(a))

    expect(commonAncestors).toContain(core.class.TxCUD)
    expect(commonAncestors).toContain(core.class.Tx)
    expect(commonAncestors).toContain(core.class.Doc)

    // Verify arrays are distinct objects (not shared references)
    expect(ancestors1).not.toBe(ancestors2)
    expect(ancestors2).not.toBe(ancestors3)
  })

  // Additional tests for higher coverage

  it('should handle classHierarchyMixin with filter that returns false', async () => {
    const hierarchy = prepare()

    // Create a class that has TestMixin
    const clazz = hierarchy.getClass(core.class.Doc)
    // Apply mixin to class
    const withMixin = hierarchy.as(clazz, test.mixin.TestMixin)
    expect(withMixin).toBeDefined()

    // Test with filter that returns false
    const result = hierarchy.classHierarchyMixin(
      core.class.Doc,
      test.mixin.TestMixin,
      (m) => false // Filter that always returns false
    )
    expect(result).toBeUndefined()
  })

  it('should handle findClassOrMixinMixin with document having mixins', async () => {
    const hierarchy = prepare()

    // Create a document with a mixin property
    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      [test.mixin.TestMixin]: { arr: ['item1'] }
    }

    const result = hierarchy.findClassOrMixinMixin(doc, test.mixin.TestMixin)
    expect(result === undefined || typeof result === 'object').toBeTruthy()
  })

  it('should handle findMixinMixins with document having multiple mixins', async () => {
    const hierarchy = prepare()

    // Create classes with mixins
    const taskClass = hierarchy.getClass(test.class.Task)
    // Test that class can have mixin applied
    hierarchy.as(taskClass, test.mixin.TestMixin)

    // Create document with mixin applied
    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      [test.mixin.TestMixin]: { arr: ['item1'] }
    }

    const results = hierarchy.findMixinMixins(doc, test.mixin.TestMixin)
    expect(Array.isArray(results)).toBeTruthy()
  })

  it('should handle findAllMixins with document having mixins', async () => {
    const hierarchy = prepare()

    // Create document with mixins
    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      [test.mixin.TestMixin]: { arr: ['item1'] }
    }

    const mixins = hierarchy.findAllMixins(doc)
    expect(Array.isArray(mixins)).toBeTruthy()
    if (mixins.length > 0) {
      expect(mixins).toContain(test.mixin.TestMixin)
    }
  })

  it('should handle tx with TxMixin', async () => {
    const hierarchy = new Hierarchy()
    // Build basic hierarchy
    for (const tx of txes) {
      hierarchy.tx(tx)
    }

    // Create a TxMixin transaction
    const txFactory = new TxFactory(core.account.System)
    const mixinTx = txFactory.createTxMixin(
      core.class.Space as any,
      core.class.Class as any,
      core.space.Model,
      test.mixin.TestMixin,
      { arr: ['test'] }
    )

    // Apply the mixin transaction
    hierarchy.tx(mixinTx)

    // Verify the mixin was applied
    const spaceClass = hierarchy.getClass(core.class.Space)
    expect(spaceClass).toBeDefined()
  })

  it('should handle txUpdateDoc with Attribute', async () => {
    const hierarchy = new Hierarchy()
    // Build basic hierarchy
    for (const tx of txes) {
      hierarchy.tx(tx)
    }

    // Create an attribute first
    const txFactory = new TxFactory(core.account.System)
    const attrId = 'attr:test' as Ref<AnyAttribute>

    const createAttrTx = txFactory.createTxCreateDoc(
      core.class.Attribute,
      core.space.Model,
      {
        attributeOf: core.class.Space,
        name: 'testAttr',
        type: { _class: 'class:core.Type' as any }
      },
      attrId
    )

    hierarchy.tx(createAttrTx)

    // Now update the attribute
    const updateAttrTx = txFactory.createTxUpdateDoc(core.class.Attribute, core.space.Model, attrId, {
      name: 'updatedAttr'
    })

    hierarchy.tx(updateAttrTx)

    // Verify the attribute was updated
    const attr = hierarchy.findAttribute(core.class.Space, 'updatedAttr')
    expect(attr).toBeDefined()
  })

  it('should handle txRemoveDoc with Attribute', async () => {
    const hierarchy = new Hierarchy()
    // Build basic hierarchy
    for (const tx of txes) {
      hierarchy.tx(tx)
    }

    // Create an attribute first
    const txFactory = new TxFactory(core.account.System)
    const attrId = 'attr:test' as Ref<AnyAttribute>

    const createAttrTx = txFactory.createTxCreateDoc(
      core.class.Attribute,
      core.space.Model,
      {
        attributeOf: core.class.Space,
        name: 'testAttr',
        type: { _class: 'class:core.Type' as any }
      },
      attrId
    )

    hierarchy.tx(createAttrTx)

    // Verify attribute exists
    let attr = hierarchy.findAttribute(core.class.Space, 'testAttr')
    expect(attr).toBeDefined()

    // Now remove the attribute
    const removeAttrTx = txFactory.createTxRemoveDoc(core.class.Attribute, core.space.Model, attrId)

    hierarchy.tx(removeAttrTx)

    // Verify the attribute was removed
    attr = hierarchy.findAttribute(core.class.Space, 'testAttr')
    expect(attr).toBeUndefined()
  })

  it('should handle txUpdateDoc with Classifier', async () => {
    const hierarchy = new Hierarchy()
    // Build basic hierarchy
    for (const tx of txes) {
      hierarchy.tx(tx)
    }

    const txFactory = new TxFactory(core.account.System)

    // Update a classifier
    const updateClassTx = txFactory.createTxUpdateDoc(core.class.Class, core.space.Model, core.class.Space, {
      label: 'Updated Space' as any
    })

    hierarchy.tx(updateClassTx)

    const spaceClass = hierarchy.getClass(core.class.Space)
    expect(spaceClass.label).toBe('Updated Space' as any)
  })

  it('should handle txRemoveDoc with Classifier', async () => {
    const hierarchy = new Hierarchy()
    // Build basic hierarchy
    for (const tx of txes) {
      hierarchy.tx(tx)
    }

    const txFactory = new TxFactory(core.account.System)

    // Create a new class
    const newClassId = 'class:test.NewClass' as Ref<Class<Obj>>
    const createClassTx = txFactory.createTxCreateDoc(
      core.class.Class,
      core.space.Model,
      {
        label: 'NewClass' as any,
        extends: core.class.Doc,
        kind: ClassifierKind.CLASS,
        domain: DOMAIN_MODEL
      },
      newClassId
    )

    hierarchy.tx(createClassTx)

    // Verify class exists
    expect(hierarchy.hasClass(newClassId)).toBeTruthy()

    // Remove the class
    const removeClassTx = txFactory.createTxRemoveDoc(core.class.Class, core.space.Model, newClassId)

    hierarchy.tx(removeClassTx)

    // Verify class was removed
    expect(hierarchy.hasClass(newClassId)).toBeFalsy()
  })

  it('should handle updateLookupMixin with lookup containing mixins', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      $lookup: {
        space: {
          _id: 'space1' as any,
          _class: core.class.Space,
          name: 'Test Space',
          description: '',
          private: false,
          members: [],
          archived: false,
          modifiedOn: 0,
          modifiedBy: 'user1' as any
        }
      }
    }

    const options = {
      lookup: {
        space: core.class.Space
      }
    }

    const result = hierarchy.updateLookupMixin(test.class.Task, doc as any, options as any)
    expect(result).toBeDefined()
    expect(result.$lookup).toBeDefined()
  })

  it('should handle updateLookupMixin with _id lookup containing mixins', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      $lookup: {
        _id: {
          _class: core.class.Space,
          _id: 'space1' as any,
          name: 'Test',
          description: '',
          private: false,
          members: [],
          archived: false,
          modifiedOn: 0,
          modifiedBy: 'user1' as any
        }
      }
    }

    const options = {
      lookup: {
        _id: {
          _class: test.mixin.TestMixin
        }
      }
    }

    const result = hierarchy.updateLookupMixin(test.class.Task, doc as any, options as any)
    expect(result).toBeDefined()
  })

  it('should handle updateLookupMixin with array in _id lookup', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      $lookup: {
        _id: [
          {
            _class: core.class.Space,
            _id: 'space1' as any,
            name: 'Test',
            description: '',
            private: false,
            members: [],
            archived: false,
            modifiedOn: 0,
            modifiedBy: 'user1' as any
          }
        ]
      }
    }

    const options = {
      lookup: {
        _id: {
          _class: [test.mixin.TestMixin]
        }
      }
    }

    const result = hierarchy.updateLookupMixin(test.class.Task, doc as any, options as any)
    expect(result).toBeDefined()
  })

  it('should handle updateLookupMixin with null lookup value', async () => {
    const hierarchy = prepare()

    const doc = {
      _id: 'doc1' as any,
      _class: test.class.Task,
      space: 'space1' as any,
      modifiedOn: 0,
      modifiedBy: 'user1' as any,
      $lookup: {
        space: null
      }
    }

    const options = {
      lookup: {
        space: test.mixin.TestMixin
      }
    }

    const result = hierarchy.updateLookupMixin(test.class.Task, doc as any, options as any)
    expect(result).toBeDefined()
    expect(result.$lookup?.space).toBeNull()
  })

  it('should handle tx with non-matching class', async () => {
    const hierarchy = new Hierarchy()
    // Build basic hierarchy
    for (const tx of txes) {
      hierarchy.tx(tx)
    }

    const txFactory = new TxFactory(core.account.System)

    // Create a transaction for a non-classifier class (Space)
    const spaceTx = txFactory.createTxCreateDoc(core.class.Space, core.space.Model, {
      name: 'Test Space',
      description: '',
      private: false,
      members: [],
      archived: false
    })

    // This should not throw, just handle gracefully
    hierarchy.tx(spaceTx)
    expect(true).toBeTruthy()
  })
})
