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
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { Process } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import process from '../plugin'
  import { createExecution } from '../utils'

  export let value: Card

  const client = getClient()
  const h = client.getHierarchy()

  const asc = h.getAncestors(value._class)
  const mixins = h.getDescendants(value._class).filter((p) => h.hasMixin(value, p))
  const resClasses = [...asc, ...mixins]

  const res = client.getModel().findAllSync(process.class.Process, {})
  const processes = res.filter((it) => resClasses.includes(it.masterTag))

  async function filterProcesses (processes: Process[]): Promise<Process[]> {
    const res: Process[] = []
    const shouldCheck: Process[] = []
    for (const val of processes) {
      if (val.parallelExecutionForbidden === true) {
        shouldCheck.push(val)
      } else {
        res.push(val)
      }
    }
    if (shouldCheck.length === 0) return res

    const executions = await client.findAll(process.class.Execution, {
      process: { $in: shouldCheck.map((it) => it._id) },
      done: false
    })
    const notAllowed = new Set(executions.map((it) => it.process))
    for (const val of shouldCheck) {
      if (!notAllowed.has(val._id)) {
        res.push(val)
      }
    }
    return res
  }

  const dispatch = createEventDispatcher()

  async function runProcess (_id: Ref<Process>): Promise<void> {
    await createExecution(value._id, _id)
    dispatch('close')
  }
</script>

<div class="antiPopup">
  <div class="ap-space x2" />
  <div class="ap-scroll">
    {#if processes.length === 0}
      <div class="flex-row-center p-4">
        <Label label={process.string.NoProcesses} />
      </div>
    {:else}
      {#await filterProcesses(processes) then processes}
        {#each processes as process}
          <button
            class="ap-menuItem flex-row-center withIcon w-full"
            on:click|preventDefault|stopPropagation={async () => {
              await runProcess(process._id)
            }}
          >
            {process.name}
          </button>
        {/each}
      {/await}
    {/if}
  </div>
  <div class="ap-space x2" />
</div>
