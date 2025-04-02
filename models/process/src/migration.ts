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

import core, { type Ref, TxOperations } from '@hcengineering/core'
import {
  tryUpgrade,
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient
} from '@hcengineering/model'
import { type Func, parseContext, type ProcessFunction } from '@hcengineering/process'
import { processId } from '.'
import process from './plugin'

export const processOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {},
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, processId, [
      {
        state: 'migrateStateFuncs',
        func: migrateStateFuncs
      }
    ])
  }
}

function getContext (value: string): string | undefined {
  const context = parseContext(value)
  if (context !== undefined) {
    let contextChanged = false
    if (context.functions !== undefined) {
      for (let i = 0; i < context.functions.length; i++) {
        const func = context.functions[i] as any
        if (typeof func === 'string') {
          const res: Func = {
            func: func as Ref<ProcessFunction>,
            props: {}
          }
          context.functions[i] = res
          contextChanged = true
        }
      }
    }
    if (contextChanged) {
      return '$' + JSON.stringify(context)
    }
  }
}

async function migrateStateFuncs (client: MigrationUpgradeClient): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  const states = await client.findAll(process.class.State, {})
  for (const state of states) {
    let changed = false
    const actions = state.actions
    for (const action of actions) {
      for (const key of Object.keys(action.params)) {
        const value = (action.params as any)[key]
        const context = getContext(value)
        if (context !== undefined) {
          ;(action.params as any)[key] = context
          changed = true
        }
      }
    }
    const endAction = state.endAction
    if (endAction != null) {
      for (const key of Object.keys(endAction.params)) {
        const value = (endAction.params as any)[key]
        const context = getContext(value)
        if (context !== undefined) {
          ;(endAction.params as any)[key] = context
          changed = true
        }
      }
    }
    if (changed) {
      await txOp.updateDoc(state._class, state.space, state._id, { actions, endAction })
    }
  }
}
