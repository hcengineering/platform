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

import type { IntlString } from '@hcengineering/platform'
import type { Class, Ref, Obj, Doc } from '@hcengineering/core'
import { Model, Prop, TypeString, Builder } from '../dsl'
import core from '@hcengineering/core'

function removeIds (txes: Doc[]): void {
  txes.forEach((i) => {
    delete (i as Partial<Doc>)._id
  })
}

describe('dsl', () => {
  it('should not fail empty generateTx', () => {
    const builder = new Builder()
    builder.createModel()
    expect(builder.getTxes()).toEqual([])
  })

  it('should generate txes', () => {
    @Model('class:test.MyClass' as Ref<Class<Obj>>, core.class.Doc)
    class MyClass {
      _class!: Ref<Class<MyClass>>
      @Prop(TypeString(), 'name' as IntlString) name!: string
    }
    const builder = new Builder()
    builder.createModel(MyClass)
    const txes = builder.getTxes()
    removeIds(txes)
    expect(txes).toEqual([
      {
        _class: 'class:core.TxCreateDoc',
        space: 'space:core.Tx',
        modifiedBy: 'account:core.System',
        modifiedOn: 0,
        objectId: 'class:test.MyClass',
        objectClass: 'class:core.Class',
        objectSpace: 'space:core.Model',
        attributes: {
          kind: 0,
          extends: 'class:core.Doc'
        }
      },
      {
        objectId: 'class:test.MyClass',
        _class: 'class:core.TxCreateDoc',
        space: 'space:core.Tx',
        modifiedBy: 'account:core.System',
        modifiedOn: 0,
        objectSpace: 'space:core.Model',
        objectClass: 'class:core.Attribute',
        attributes: {
          type: {
            _class: 'class:core.TypeString'
          },
          name: 'name'
        }
      }
    ])
  })

  it('should generate txes extends', () => {
    @Model('class:test.MyClass' as Ref<Class<Obj>>, core.class.Doc)
    class MyClass {
      _class!: Ref<Class<MyClass>>
      @Prop(TypeString(), 'name' as IntlString) name!: string
    }
    @Model('class:test.MyClass2' as Ref<Class<Obj>>, 'class:test.MyClass' as Ref<Class<Obj>>)
    class MyClass2 extends MyClass {
      @Prop(TypeString(), 'lastName' as IntlString) lastName!: string
    }

    const valid = [
      {
        _class: 'class:core.TxCreateDoc',
        space: 'space:core.Tx',
        modifiedBy: 'account:core.System',
        modifiedOn: 0,
        objectId: 'class:test.MyClass',
        objectClass: 'class:core.Class',
        objectSpace: 'space:core.Model',
        attributes: {
          kind: 0,
          extends: 'class:core.Doc'
        }
      },
      {
        objectId: 'class:test.MyClass',
        _class: 'class:core.TxCreateDoc',
        space: 'space:core.Tx',
        modifiedBy: 'account:core.System',
        modifiedOn: 0,
        objectSpace: 'space:core.Model',
        objectClass: 'class:core.Attribute',
        attributes: {
          type: {
            _class: 'class:core.TypeString'
          },
          name: 'name'
        }
      },
      {
        _class: 'class:core.TxCreateDoc',
        space: 'space:core.Tx',
        modifiedBy: 'account:core.System',
        modifiedOn: 0,
        objectId: 'class:test.MyClass2',
        objectClass: 'class:core.Class',
        objectSpace: 'space:core.Model',
        attributes: {
          kind: 0,
          extends: 'class:test.MyClass'
        }
      },
      {
        objectId: 'class:test.MyClass2',
        _class: 'class:core.TxCreateDoc',
        space: 'space:core.Tx',
        modifiedBy: 'account:core.System',
        modifiedOn: 0,
        objectSpace: 'space:core.Model',
        objectClass: 'class:core.Attribute',
        attributes: {
          type: {
            _class: 'class:core.TypeString'
          },
          name: 'lastName'
        }
      }
    ]

    const builder = new Builder()
    builder.createModel(MyClass, MyClass2)
    const txes = builder.getTxes()
    removeIds(txes)
    expect(txes).toEqual(valid)

    const builder2 = new Builder()
    builder2.createModel(MyClass2, MyClass)
    const txes2 = builder2.getTxes()
    removeIds(txes2)
    expect(txes).toEqual(valid)
  })
})
