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
})
