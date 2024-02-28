//
// Copyright © 2023 Hardcore Engineering Inc.
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

import { Mixin, type Builder } from '@hcengineering/model'

import core, { type Tx } from '@hcengineering/core'
import { TClass } from '@hcengineering/model-core'
import { type Resource } from '@hcengineering/platform'
import serverCore, { type TriggerControl } from '@hcengineering/server-core'
import tracker from '@hcengineering/tracker'
import serverTime, { type ToDoFactory, type OnToDo } from '@hcengineering/server-time'
import { type ToDo, type WorkSlot } from '@hcengineering/time'

@Mixin(serverTime.mixin.ToDoFactory, core.class.Class)
export class TToDoFactory extends TClass implements ToDoFactory {
  factory!: Resource<(tx: Tx, control: TriggerControl) => Promise<Tx[]>>
}

@Mixin(serverTime.mixin.OnToDo, core.class.Class)
export class TOnToDo extends TClass implements OnToDo {
  onDone!: Resource<(control: TriggerControl, workslots: WorkSlot[], todo: ToDo) => Promise<Tx[]>>
}

export function createModel (builder: Builder): void {
  builder.createModel(TToDoFactory, TOnToDo)

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTime.trigger.OnTask
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTime.trigger.OnToDoUpdate,
    txMatch: {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxUpdateDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTime.trigger.OnToDoRemove,
    txMatch: {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxRemoveDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTime.trigger.OnToDoCreate,
    txMatch: {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxCreateDoc
    }
  })

  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverTime.trigger.OnWorkSlotCreate,
    txMatch: {
      _class: core.class.TxCollectionCUD,
      'tx._class': core.class.TxCreateDoc
    }
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverTime.mixin.ToDoFactory, {
    factory: serverTime.function.IssueToDoFactory
  })

  builder.mixin(tracker.class.Issue, core.class.Class, serverTime.mixin.OnToDo, {
    onDone: serverTime.function.IssueToDoDone
  })
}

export * from '@hcengineering/server-time'
