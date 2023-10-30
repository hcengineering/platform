<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
-->
<script lang="ts">
  import type { Card } from '@hcengineering/board'
  import { getClient } from '@hcengineering/presentation'
  import { CheckBox, Label } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import core, { Status, TxProcessor } from '@hcengineering/core'
  import board from '../../plugin'

  export let value: Card
  const client = getClient()

  $: currentState = $statusStore.byId.get(value.status)

  $: store = $statusStore

  async function updateState (e: CustomEvent<boolean>): Promise<void> {
    if (currentState !== undefined) {
      if (e.detail) {
        const targetState = store.byType
          .get(currentState.space)
          ?.find((s) => s.category === board.statusCategory.Completed)
        if (targetState) {
          await client.update(value, { status: targetState._id })
        }
      } else {
        let targetState: Status | undefined = undefined
        const txes = await client.findAll(core.class.Tx, { 'tx.objectId': value._id })
        while (txes.length) {
          const doc = TxProcessor.buildDoc2Doc<Card>(txes)
          if (doc === undefined) {
            break
          }
          targetState = store.byId.get(doc.status)
          if (targetState !== undefined && targetState.category !== board.statusCategory.Completed) {
            await client.update(value, { status: targetState._id })
            return
          }
          txes.pop()
        }
      }
    }
  }
</script>

{#if value}
  <div class="attributes-bar-container">
    <div class="label fs-bold">
      <Label label={board.string.Completed} />
    </div>
    <div class="ml-4">
      <CheckBox checked={currentState?.category === board.statusCategory.Completed} on:value={updateState} />
    </div>
  </div>
{/if}

<style lang="scss">
  .attributes-bar-container {
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-flow: row;
    justify-content: start;
    align-items: center;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
    width: 100%;
    height: min-content;
  }
</style>
