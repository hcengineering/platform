//
// Copyright © 2026 Hardcore Engineering Inc.
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
  ClassifierKind,
  DOMAIN_MODEL,
  DOMAIN_TX,
  TxFactory,
  type Class,
  type Data,
  type Doc,
  type Obj,
  type Ref,
  type TxCUD,
  type TxCreateDoc
} from '@hcengineering/core'
import type { IntlString } from '@hcengineering/platform'
import processPlugin from '../plugin'
import card from '@hcengineering/card'

export const txFactory = new TxFactory(core.account.System)

export function createClass (_class: Ref<Class<Obj>>, attributes: Data<Class<Obj>>): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(core.class.Class, core.space.Model, attributes, _class)
}

export function createDoc<T extends Doc> (_class: Ref<Class<T>>, attributes: Data<T>, id?: Ref<T>): TxCreateDoc<Doc> {
  return txFactory.createTxCreateDoc(_class, core.space.Model, attributes, id)
}

export function genMinModel (): Array<TxCUD<Doc>> {
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
    createClass(core.class.Space, {
      label: 'Space' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS,
      domain: DOMAIN_MODEL
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

  // Add Card and Attribute related classes
  txes.push(
    createClass(card.class.Card, { label: 'Card' as IntlString, extends: core.class.Doc, kind: ClassifierKind.CLASS })
  )
  txes.push(
    createClass(core.class.Attribute, {
      label: 'Attribute' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS
    })
  )

  // Add Process related classes
  txes.push(
    createClass(processPlugin.class.Process, {
      label: 'Process' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(processPlugin.class.State, {
      label: 'State' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(processPlugin.class.Transition, {
      label: 'Transition' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(processPlugin.class.Method, {
      label: 'Method' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS
    })
  )
  txes.push(
    createClass(processPlugin.class.Trigger, {
      label: 'Trigger' as IntlString,
      extends: core.class.Doc,
      kind: ClassifierKind.CLASS
    })
  )

  // Add real methods from actions.ts
  txes.push(
    createDoc(processPlugin.class.Method, { requiredParams: ['_id'] } as any, processPlugin.method.RunSubProcess)
  )
  txes.push(
    createDoc(processPlugin.class.Method, { requiredParams: ['user'] } as any, processPlugin.method.RequestApproval)
  )
  txes.push(
    createDoc(processPlugin.class.Method, { requiredParams: ['title', 'user'] } as any, processPlugin.method.CreateToDo)
  )
  txes.push(createDoc(processPlugin.class.Method, { requiredParams: [] } as any, processPlugin.method.UpdateCard))
  txes.push(
    createDoc(
      processPlugin.class.Method,
      { requiredParams: ['title', '_class'] } as any,
      processPlugin.method.CreateCard
    )
  )
  txes.push(
    createDoc(
      processPlugin.class.Method,
      { requiredParams: ['association', 'direction', '_id'] } as any,
      processPlugin.method.AddRelation
    )
  )
  txes.push(createDoc(processPlugin.class.Method, { requiredParams: ['_id'] } as any, processPlugin.method.AddTag))
  txes.push(createDoc(processPlugin.class.Method, { requiredParams: ['_id'] } as any, processPlugin.method.CancelToDo))
  txes.push(
    createDoc(processPlugin.class.Method, { requiredParams: ['_id'] } as any, processPlugin.method.CancelSubProcess)
  )
  txes.push(createDoc(processPlugin.class.Method, { requiredParams: [] } as any, processPlugin.method.LockCard))
  txes.push(createDoc(processPlugin.class.Method, { requiredParams: ['_id'] } as any, processPlugin.method.LockSection))
  txes.push(createDoc(processPlugin.class.Method, { requiredParams: [] } as any, processPlugin.method.UnlockCard))
  txes.push(
    createDoc(processPlugin.class.Method, { requiredParams: ['_id'] } as any, processPlugin.method.UnlockSection)
  )
  txes.push(createDoc(processPlugin.class.Method, { requiredParams: ['value'] } as any, processPlugin.method.LockField))
  txes.push(
    createDoc(processPlugin.class.Method, { requiredParams: ['value'] } as any, processPlugin.method.UnlockField)
  )

  // Add real triggers from triggers.ts
  txes.push(
    createDoc(
      processPlugin.class.Trigger,
      { requiredParams: ['_id'] } as any,
      processPlugin.trigger.OnApproveRequestApproved
    )
  )
  txes.push(
    createDoc(
      processPlugin.class.Trigger,
      { requiredParams: ['_id'] } as any,
      processPlugin.trigger.OnApproveRequestRejected
    )
  )
  txes.push(
    createDoc(processPlugin.class.Trigger, { requiredParams: ['_id'] } as any, processPlugin.trigger.OnToDoClose)
  )
  txes.push(
    createDoc(processPlugin.class.Trigger, { requiredParams: [] } as any, processPlugin.trigger.OnExecutionStart)
  )
  txes.push(
    createDoc(processPlugin.class.Trigger, { requiredParams: ['_id'] } as any, processPlugin.trigger.OnToDoRemove)
  )
  txes.push(createDoc(processPlugin.class.Trigger, { requiredParams: [] } as any, processPlugin.trigger.OnCardUpdate))
  txes.push(
    createDoc(processPlugin.class.Trigger, { requiredParams: [] } as any, processPlugin.trigger.WhenFieldChanges)
  )
  txes.push(
    createDoc(processPlugin.class.Trigger, { requiredParams: [] } as any, processPlugin.trigger.OnSubProcessesDone)
  )
  txes.push(
    createDoc(
      processPlugin.class.Trigger,
      { requiredParams: ['process'] } as any,
      processPlugin.trigger.OnSubProcessMatch
    )
  )
  txes.push(createDoc(processPlugin.class.Trigger, { requiredParams: [] } as any, processPlugin.trigger.OnTime))

  return txes
}
