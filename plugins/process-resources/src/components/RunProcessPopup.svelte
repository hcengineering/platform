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
  import { getClient } from '@hcengineering/presentation'
  import process from '../plugin'
  import { Label, Loading } from '@hcengineering/ui'
  import { Process } from '@hcengineering/process'
  import { createEventDispatcher } from 'svelte'
  import core, { Ref } from '@hcengineering/core'

  export let value: Card

  const client = getClient()
  const h = client.getHierarchy()

  const asc = h.getAncestors(value._class)
  const mixins = h.getDescendants(value._class).filter((p) => h.hasMixin(value, p))
  const resClasses = [...asc, ...mixins]

  let loading = true
  let processes: Process[] = []

  void client
    .findAll(process.class.Process, {})
    .then((res) => {
      processes = res.filter((it) => resClasses.includes(it.masterTag))
      loading = false
    })
    .catch((err) => {
      console.error(err)
      loading = false
    })

  const dispatch = createEventDispatcher()

  async function runProcess (_id: Ref<Process>): Promise<void> {
    await client.createDoc(process.class.Execution, core.space.Workspace, {
      process: _id,
      currentState: null,
      card: value._id,
      done: false,
      rollback: {},
      currentToDo: null,
      assignee: null
    })
    dispatch('close')
  }
</script>

<div class="antiPopup">
  <div class="ap-space x2" />
  <div class="ap-scroll">
    {#if loading}
      <Loading />
    {:else if processes.length === 0}
      <Label label={process.string.NoProcesses} />
    {:else}
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
    {/if}
  </div>
  <div class="ap-space x2" />
</div>
