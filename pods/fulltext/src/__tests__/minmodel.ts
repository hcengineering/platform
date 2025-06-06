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

import core, {
  type AccountUuid,
  type Arr,
  type AttachedDoc,
  type Attribute,
  type Class,
  ClassifierKind,
  type Data,
  type Doc,
  type Domain,
  IndexKind,
  type Mixin,
  type Obj,
  type PersonId,
  type Ref,
  type Space,
  type Tx,
  type TxCreateDoc,
  TxFactory
} from '@hcengineering/core'
import type { IntlString, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'

import buildModel from '@hcengineering/model-all'

const txFactory = new TxFactory(core.account.System)

function createClass (_class: Ref<Class<Obj>>, attributes: Data<Class<Obj>>): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(core.class.Class, core.space.Model, attributes, _class)
}

function createAttribute (
  _class: Ref<Class<Obj>>,
  attributes: Omit<Data<Attribute<any>>, 'attributeOf'>
): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(
    core.class.Attribute,
    core.space.Model,
    { ...attributes, attributeOf: _class },
    (_class + attributes.name) as Ref<Attribute<any>>
  )
}

/**
 * @public
 */
export function createDoc<T extends Doc> (
  _class: Ref<Class<T>>,
  attributes: Data<T>,
  id?: Ref<T>,
  modifiedBy?: PersonId
): TxCreateDoc<Doc> {
  const result = txFactory.createTxCreateDoc(_class, core.space.Model, attributes, id)
  if (modifiedBy !== undefined) {
    result.modifiedBy = modifiedBy
  }
  return result
}

/**
 * @public
 */
export interface TestMixin extends Doc {
  arr: Arr<string>
}

/**
 * @public
 */
export interface AttachedComment extends AttachedDoc {
  message: string
}

export interface TestProject extends Space {
  prjName: string
}

export interface TestDocument extends Doc {
  title: string

  description: string
}

/**
 * @public
 */
export const test = plugin('test' as Plugin, {
  mixin: {
    TestMixin: '' as Ref<Mixin<TestMixin>>
  },
  class: {
    TestComment: '' as Ref<Class<AttachedComment>>,
    TestProject: '' as Ref<Class<TestProject>>,
    TestDocument: '' as Ref<Class<TestDocument>>
  }
})

const DOMAIN_TEST: Domain = 'test' as Domain

/**
 * @public
 * Generate minimal model for testing purposes.
 * @returns R
 */
export function genMinModel (): Tx[] {
  const txes = buildModel().getTxes()
  // Fill Tx'es with basic model classes.

  txes.push(
    createClass(test.mixin.TestMixin, {
      label: 'TestMixin' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.MIXIN
    })
  )

  txes.push(
    createClass(test.class.TestProject, {
      label: 'TestProject' as IntlString,
      extends: core.class.Space,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_TEST
    })
  )

  txes.push(
    createClass(test.class.TestComment, {
      label: 'TestComment' as IntlString,
      extends: core.class.AttachedDoc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_TEST
    })
  )

  txes.push(
    ...[
      createClass(test.class.TestDocument, {
        label: 'TestDocument' as IntlString,
        extends: core.class.Doc,
        kind: ClassifierKind.CLASS,
        domain: DOMAIN_TEST
      }),
      createAttribute(test.class.TestDocument, {
        name: 'title',
        type: core.class.TypeString,
        index: IndexKind.FullText
      }),
      createAttribute(test.class.TestDocument, {
        name: 'description',
        type: core.class.TypeString,
        index: IndexKind.FullText
      })
    ]
  )

  const u1 = 'User1' as AccountUuid
  const u2 = 'User2' as AccountUuid
  // TODO: fixme!
  txes.push(
    // createDoc(core.class.Account, { email: 'user1@site.com', role: AccountRole.User }, u1),
    // createDoc(core.class.Account, { email: 'user2@site.com', role: AccountRole.User }, u2),
    createDoc(core.class.Space, {
      name: 'Sp1',
      description: '',
      private: false,
      members: [u1, u2],
      archived: false
    })
  )

  txes.push(
    createDoc(core.class.Space, {
      name: 'Sp2',
      description: '',
      private: false,
      members: [u1],
      archived: false
    })
  )
  return txes
}
