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

import type { IntlString, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import type { Arr, Class, Data, Doc, Mixin, Obj, Ref } from '../classes'
import { AttachedDoc, ClassifierKind, DOMAIN_MODEL } from '../classes'
import core from '../component'
import type { TxCreateDoc, TxCUD } from '../tx'
import { DOMAIN_TX, TxFactory } from '../tx'

const txFactory = new TxFactory(core.account.System)

function createClass (_class: Ref<Class<Obj>>, attributes: Data<Class<Obj>>): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(core.class.Class, core.space.Model, attributes, _class)
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

export const test = plugin('test' as Plugin, {
  mixin: {
    TestMixin: '' as Ref<Mixin<TestMixin>>
  },
  class: {
    TestComment: '' as Ref<Class<AttachedComment>>
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
  txes.push(createClass(core.class.Doc, { label: 'Doc' as IntlString, extends: core.class.Obj, kind: ClassifierKind.CLASS }))
  txes.push(createClass(core.class.AttachedDoc, { label: 'AttachedDoc' as IntlString, extends: core.class.Doc, kind: ClassifierKind.MIXIN }))
  txes.push(createClass(core.class.Class, { label: 'Class' as IntlString, extends: core.class.Doc, kind: ClassifierKind.CLASS, domain: DOMAIN_MODEL }))
  txes.push(createClass(core.class.Space, { label: 'Space' as IntlString, extends: core.class.Doc, kind: ClassifierKind.CLASS, domain: DOMAIN_MODEL }))
  txes.push(createClass(core.class.Account, { label: 'Account' as IntlString, extends: core.class.Doc, kind: ClassifierKind.CLASS, domain: DOMAIN_MODEL }))

  txes.push(createClass(core.class.Tx, { label: 'Tx' as IntlString, extends: core.class.Doc, kind: ClassifierKind.CLASS, domain: DOMAIN_TX }))
  txes.push(createClass(core.class.TxCUD, { label: 'TxCUD' as IntlString, extends: core.class.Tx, kind: ClassifierKind.CLASS, domain: DOMAIN_TX }))
  txes.push(createClass(core.class.TxCreateDoc, { label: 'TxCreateDoc' as IntlString, extends: core.class.TxCUD, kind: ClassifierKind.CLASS }))
  txes.push(createClass(core.class.TxUpdateDoc, { label: 'TxUpdateDoc' as IntlString, extends: core.class.TxCUD, kind: ClassifierKind.CLASS }))
  txes.push(createClass(core.class.TxRemoveDoc, { label: 'TxRemoveDoc' as IntlString, extends: core.class.TxCUD, kind: ClassifierKind.CLASS }))
  txes.push(createClass(core.class.TxCollectionCUD, { label: 'TxCollectionCUD' as IntlString, extends: core.class.TxCUD, kind: ClassifierKind.CLASS }))

  txes.push(createClass(test.mixin.TestMixin, { label: 'TestMixin' as IntlString, extends: core.class.Doc, kind: ClassifierKind.MIXIN }))

  txes.push(createClass(test.class.TestComment, { label: 'TestComment' as IntlString, extends: core.class.AttachedDoc, kind: ClassifierKind.CLASS }))

  txes.push(
    createDoc(core.class.Space, {
      name: 'Sp1',
      description: '',
      private: false,
      members: []
    })
  )

  txes.push(
    createDoc(core.class.Space, {
      name: 'Sp2',
      description: '',
      private: false,
      members: []
    })
  )
  return txes
}
