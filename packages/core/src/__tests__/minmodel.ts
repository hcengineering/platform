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

import type { IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { Arr, Class, Data, Doc, Interface, Mixin, Obj, Ref } from '../classes'
import { AttachedDoc, ClassifierKind, DOMAIN_MODEL } from '../classes'
import core from '../component'
import type { TxCreateDoc, TxCUD } from '../tx'
import { DOMAIN_TX, TxFactory } from '../tx'

const txFactory = new TxFactory(core.account.System)

function createClass (_class: Ref<Class<Obj>>, attributes: Data<Class<Obj>>): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(core.class.Class, core.space.Model, attributes, _class)
}

function createInterface (_interface: Ref<Interface<Doc>>, attributes: Data<Interface<Doc>>): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(core.class.Interface, core.space.Model, attributes, _interface)
}

export function createDoc<T extends Doc> (_class: Ref<Class<T>>, attributes: Data<T>): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(_class, core.space.Model, attributes)
}

export interface TestMixin extends Doc {
  arr: Arr<string>
}

export interface AttachedComment extends AttachedDoc {
  message: string
}

export interface WithState extends Doc {
  state: number
  number: number
}
export interface Task extends Doc, WithState {
  name: string
}

export interface TaskMixinTodos extends Task {
  todos: number
}

export interface TaskMixinTodo extends AttachedDoc {
  text: string
}

export interface TaskCheckItem extends AttachedDoc, WithState {
  name: string
  complete: boolean
}

export const test = plugin('test' as Plugin, {
  mixin: {
    TestMixin: '' as Ref<Mixin<TestMixin>>,
    TaskMixinTodos: '' as Ref<Mixin<TaskMixinTodos>>
  },
  class: {
    Task: '' as Ref<Class<Task>>,
    TaskCheckItem: '' as Ref<Class<TaskCheckItem>>,
    TestComment: '' as Ref<Class<AttachedComment>>,
    TestMixinTodo: '' as Ref<Mixin<TaskMixinTodo>>
  },
  interface: {
    WithState: '' as Ref<Interface<WithState>>,
    DummyWithState: '' as Ref<Interface<WithState>>
  }
})

/**
 * Generate minimal model for testing purposes.
 * @returns R
 */
export function genMinModel (): TxCUD<Doc>[] {
  const txes = []
  // Fill Tx'es with basic model classes.
  txes.push(createClass(core.class.Obj, { label: 'Obj' as IntlString, kind: ClassifierKind.CLASS }))
  txes.push(
    createClass(core.class.Doc, { label: 'Doc' as IntlString, extends: core.class.Obj, kind: ClassifierKind.CLASS })
  )
  txes.push(
    createClass(core.class.AttachedDoc, {
      label: 'AttachedDoc' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.MIXIN
    })
  )
  txes.push(
    createClass(core.class.Class, {
      label: 'Class' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
    })
  )
  txes.push(
    createClass(core.class.Interface, {
      label: 'Interface' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(core.class.Space, {
      label: 'Space' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
    })
  )
  txes.push(
    createClass(core.class.Account, {
      label: 'Account' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
    })
  )

  txes.push(
    createInterface(test.interface.WithState, {
      label: 'WithState' as IntlString,
      extends: [],
      kind: ClassifierKind.INTERFACE
    })
  )

  txes.push(
    createClass(core.class.Tx, {
      label: 'Tx' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_TX
    })
  )
  txes.push(
    createClass(core.class.TxCUD, {
      label: 'TxCUD' as IntlString,
      extends: core.class.Tx,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_TX
    })
  )
  txes.push(
    createClass(core.class.TxCreateDoc, {
      label: 'TxCreateDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(core.class.TxUpdateDoc, {
      label: 'TxUpdateDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(core.class.TxRemoveDoc, {
      label: 'TxRemoveDoc' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(core.class.TxCollectionCUD, {
      label: 'TxCollectionCUD' as IntlString,
      extends: core.class.TxCUD,
      kind: ClassifierKind.CLASS
    })
  )

  txes.push(
    createClass(test.mixin.TestMixin, {
      label: 'TestMixin' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.MIXIN
    })
  )

  txes.push(
    createInterface(test.interface.DummyWithState, {
      label: 'DummyWithState' as IntlString,
      extends: [test.interface.WithState],
      kind: ClassifierKind.INTERFACE
    })
  )
  txes.push(
    createClass(test.class.TestComment, {
      label: 'TestComment' as IntlString,
      extends: core.class.AttachedDoc,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(test.class.Task, {
      label: 'Task' as IntlString,
      extends: core.class.Doc,
      implements: [test.interface.DummyWithState],
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(test.class.TaskCheckItem, {
      label: 'Task' as IntlString,
      extends: core.class.AttachedDoc,
      implements: [test.interface.WithState],
      kind: ClassifierKind.CLASS
    })
  )

  txes.push(
    createClass(test.mixin.TaskMixinTodos, {
      label: 'TaskMixinTodos' as IntlString,
      extends: test.class.Task,
      kind: ClassifierKind.MIXIN
    })
  )
  txes.push(
    createClass(test.class.TestMixinTodo, {
      label: 'TestMixinTodo' as IntlString,
      extends: core.class.AttachedDoc,
      kind: ClassifierKind.CLASS
    })
  )

  txes.push(
    createDoc(core.class.Space, {
      name: 'Sp1',
      description: '',
      private: false,
      members: [],
      archived: false
    })
  )

  txes.push(
    createDoc(core.class.Space, {
      name: 'Sp2',
      description: '',
      private: false,
      members: [],
      archived: false
    })
  )
  return txes
}
