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

import { Card } from '@hcengineering/card'
import { DocumentUpdate, Tx } from '@hcengineering/core'
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

export function FieldChangedRollback (context: Record<string, any>, control: ProcessControl): Tx | undefined {
  const card = context.card as Card
  const ops = context.operations as DocumentUpdate<Card>
  if (card === undefined || ops === undefined) return
  const antiOps: DocumentUpdate<any> = invertUpdate(ops)
  return control.client.txFactory.createTxUpdateDoc(card._class, card.space, card._id, antiOps)
}

function invertUpdate (ops: Record<string, any>): Record<string, any> {
  const antiOps: Record<string, any> = {}
  for (const [key, value] of Object.entries(ops)) {
    if (key.startsWith('$')) {
      const inverted = invertOperator(key, value)
      if (inverted !== undefined) {
        for (const [antiKey, antiValue] of Object.entries(inverted)) {
          antiOps[antiKey] = { ...(antiOps[antiKey] ?? {}), ...antiValue }
        }
      }
    } else {
      antiOps.$unset = { ...(antiOps.$unset ?? {}), [key]: true }
    }
  }
  return antiOps
}

function invertOperator (name: string, op: any): Record<string, any> | undefined {
  switch (name) {
    case '$inc': {
      const result: Record<string, number> = {}
      for (const [key, val] of Object.entries(op)) {
        result[key] = -(val as number)
      }
      return { $inc: result }
    }
    case '$push': {
      const result: Record<string, any> = {}
      for (const [key, val] of Object.entries(op)) {
        if (typeof val === 'object' && val !== null && '$each' in val) {
          result[key] = { $in: (val as any).$each }
        } else {
          result[key] = val
        }
      }
      return { $pull: result }
    }
    case '$pull': {
      const result: Record<string, any> = {}
      for (const [key, val] of Object.entries(op)) {
        if (typeof val === 'object' && val !== null && '$in' in val) {
          result[key] = { $each: (val as any).$in }
        } else {
          result[key] = { $each: [val] }
        }
      }
      return { $push: result }
    }
    case '$rename': {
      const result: Record<string, string> = {}
      for (const [key, val] of Object.entries(op)) {
        result[val as string] = key
      }
      return { $rename: result }
    }
  }
  return undefined
}
