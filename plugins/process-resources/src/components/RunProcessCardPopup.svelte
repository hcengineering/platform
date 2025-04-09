<!--
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
-->
<script lang="ts">
  import { Card } from '@hcengineering/card'
  import { CardSelector } from '@hcengineering/card-resources'
  import { Ref } from '@hcengineering/core'
  import { Card as CardPopup, getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { Dropdown, ListItem } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../plugin'
  import { createExecution } from '../utils'

  export let value: Ref<Process> | undefined

  const client = getClient()

  let process: Ref<Process> | undefined = value
  let card: Ref<Card> | undefined

  const processes = client.getModel().findAllSync(plugin.class.Process, {})

  const items: ListItem[] = processes.map((p) => ({ label: p.name, _id: p._id }))

  const dispatch = createEventDispatcher()

  async function runProcess (): Promise<void> {
    if (process === undefined || card === undefined) return
    await createExecution(card, process)
    dispatch('close')
  }

  $: selectedProcess = processes.find((p) => p._id === process)

  let ignoreObjects: Ref<Card>[] = []

  $: void filter(process)

  async function filter (process: Ref<Process> | undefined): Promise<void> {
    if (process === undefined) {
      ignoreObjects = []
      return
    }
    const pr = client.getModel().findObject(process)
    if (pr === undefined) {
      ignoreObjects = []
      return
    }
    if (pr.parallelExecutionForbidden !== true) {
      ignoreObjects = []
      return
    }

    const executions = await client.findAll(plugin.class.Execution, { process, done: false }, {})
    const cards = new Set(executions.map((it) => it.card))
    ignoreObjects = [...cards]
  }
</script>

<CardPopup
  label={plugin.string.RunProcess}
  canSave={process !== undefined && card !== undefined}
  okAction={runProcess}
  width={'menu'}
  on:close
>
  <div class="mb-4">
    <Dropdown
      {items}
      kind={'regular'}
      size={'medium'}
      placeholder={plugin.string.Process}
      disabled={value !== undefined}
      selected={items.find((i) => i._id === process)}
      on:selected={(e) => {
        process = e.detail._id
        card = undefined
      }}
    />
  </div>
  {#if selectedProcess !== undefined}
    <CardSelector
      kind={'regular'}
      size={'medium'}
      bind:value={card}
      {ignoreObjects}
      _class={selectedProcess.masterTag}
    />
  {/if}
</CardPopup>
