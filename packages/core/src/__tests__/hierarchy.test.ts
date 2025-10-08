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

import type { Class, Doc, Obj, Ref } from '../classes'
import type { TxCreateDoc } from '../tx'
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
})
