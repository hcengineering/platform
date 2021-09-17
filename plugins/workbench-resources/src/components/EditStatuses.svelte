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
  import type { Ref, Space, State } from '@anticrm/core'
  import { Dialog } from '@anticrm/ui'
  import { createQuery } from '@anticrm/presentation'

  import core from '@anticrm/core'

  export let _id: Ref<Space>

  let states: State[] = []

  const query = createQuery()
  $: query.query(core.class.State, { machine: _id }, result => { states = result })

  let selected: string | undefined = undefined
</script>


<Dialog label="Edit Statuses">
  {#each states as state}
    <div class="flex-center states" style="background-color: {state.color}" draggable={true}
      on:dragover|preventDefault={() => {
        console.log(`Dragging ${selected} over ${state._id} (${state.title})`)
      }}
      on:drop|preventDefault={() => {
        console.log(`Drop ${selected} into ${state._id} (${state.title})`)
      }}
      on:dragstart={() => {
        selected = state._id
        console.log('Start dragging: ' + selected)
      }}
      on:dragend={() => {
        console.log('End dragging: ' + selected)
        selected = undefined
      }}
    >
      {state.title}
    </div>
  {/each}
</Dialog>

<style lang="scss">
  .states {
    padding: .25rem .5rem;
    color: #fff;
    border-radius: .5rem;
    user-select: none;
    cursor: grabbing;
  }
</style>
