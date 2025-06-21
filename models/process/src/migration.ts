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

import core, { type Client, type Doc, TxOperations } from '@hcengineering/core'
import {
  type MigrateOperation,
  type MigrationClient,
  type MigrationUpgradeClient,
  tryUpgrade
} from '@hcengineering/model'
import process, { type State, type Step } from '@hcengineering/process'
import { processId } from '.'

export const processOperation: MigrateOperation = {
  async migrate (client: MigrationClient, mode): Promise<void> {},
  async upgrade (state: Map<string, Set<string>>, client: () => Promise<MigrationUpgradeClient>, mode): Promise<void> {
    await tryUpgrade(mode, state, client, processId, [
      {
        state: 'migrateActionsFromStates',
        mode: 'upgrade',
        func: migrateActionsFromStates
      }
    ])
  }
}

interface OldState extends State {
  actions: Step<Doc>[]
}

async function migrateActionsFromStates (client: Client): Promise<void> {
  const txOp = new TxOperations(client, core.account.System)
  const rollbackTransitions = await client.findAll(process.class.Transition, { to: null as any })
  for (const toRemove of rollbackTransitions) {
    await txOp.remove(toRemove, undefined, toRemove.modifiedBy)
  }
  const states = (await client.findAll(process.class.State, {})) as any as OldState[]
  const transitions = await client.findAll(process.class.Transition, {})
  const transitionsMap = new Map()
  for (const transition of transitions) {
    const arr = transitionsMap.get(transition.to) ?? []
    arr.push(transition)
    transitionsMap.set(transition.to, arr)
  }
  for (const state of states) {
    if (state.actions?.length > 0) {
      const transitions = transitionsMap.get(state._id) ?? []
      if (transitions.length === 0) {
        await txOp.createDoc(
          process.class.Transition,
          core.space.Model,
          {
            from: null,
            to: state._id,
            actions: state.actions,
            trigger: process.trigger.OnExecutionStart,
            triggerParams: {},
            process: state.process
          },
          undefined,
          undefined,
          state.modifiedBy
        )
      } else {
        for (const transition of transitions) {
          const actions = [...state.actions, transition.actions]
          await txOp.update(transition, actions, undefined, undefined, state.modifiedBy)
        }
      }
    }
  }
}
