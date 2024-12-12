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

import { Class, Doc, Mixin, Ref, Tx } from '@hcengineering/core'
import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { TriggerControl, TriggerFunc } from '@hcengineering/server-core'
import { Task } from '@hcengineering/task'
import { ToDo, WorkSlot } from '@hcengineering/time'

/**
 * @public
 */
export const serverTimeId = 'server-time' as Plugin

/**
 * @public
 */
export interface ToDoFactory extends Class<Task> {
  factory: Resource<(tx: Tx, control: TriggerControl) => Promise<Tx[]>>
}

/**
 * @public
 */
export interface OnToDo extends Class<Doc> {
  onDone: Resource<(control: TriggerControl, workslots: WorkSlot[], todo: ToDo, isDerived: boolean) => Promise<Tx[]>>
}

/**
 * @public
 */
export default plugin(serverTimeId, {
  mixin: {
    ToDoFactory: '' as Ref<Mixin<ToDoFactory>>,
    OnToDo: '' as Ref<Mixin<OnToDo>>
  },
  function: {
    IssueToDoFactory: '' as Resource<(tx: Tx, control: TriggerControl) => Promise<Tx[]>>,
    IssueToDoDone: '' as Resource<(control: TriggerControl, workslots: WorkSlot[], todo: ToDo, isDerived: boolean) => Promise<Tx[]>>
  },
  trigger: {
    OnTask: '' as Resource<TriggerFunc>,
    OnToDoUpdate: '' as Resource<TriggerFunc>,
    OnToDoRemove: '' as Resource<TriggerFunc>,
    OnToDoCreate: '' as Resource<TriggerFunc>,
    OnWorkSlotCreate: '' as Resource<TriggerFunc>,
    OnWorkSlotUpdate: '' as Resource<TriggerFunc>
  }
})
