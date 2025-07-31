//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { Tx } from '@hcengineering/core'
import { ProcessToDo } from '@hcengineering/process'
import { ProcessControl } from '@hcengineering/server-process'

export function ToDoCloseRollback (context: Record<string, any>, control: ProcessControl): Tx | undefined {
  const todo = context.todo as ProcessToDo
  if (todo === undefined) return
  return control.client.txFactory.createTxUpdateDoc(todo._class, todo.space, todo._id, { doneOn: null })
}

export function ToDoCancellRollback (context: Record<string, any>, control: ProcessControl): Tx | undefined {
  const todo = context.todo as ProcessToDo
  if (todo === undefined) return
  return control.client.txFactory.createTxCreateDoc(
    todo._class,
    todo.space,
    {
      ...todo
    },
    todo._id,
    todo.modifiedOn,
    todo.modifiedBy
  )
}
