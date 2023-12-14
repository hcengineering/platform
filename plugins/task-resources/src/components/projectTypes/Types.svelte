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
  import { Ref, WithLookup } from '@hcengineering/core'
  import { ProjectType } from '@hcengineering/task'
  import { Component, Label, ListView } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  export let type: ProjectType | undefined
  export let typeId: Ref<ProjectType> | undefined

  export let types: WithLookup<ProjectType>[] = []

  const dispatch = createEventDispatcher()
  function select (item: ProjectType): void {
    typeId = item._id
    dispatch('change', typeId)
  }
  $: selection = types.findIndex((it) => it._id === typeId)
</script>

<div id="templates" class="flex-col w-full">
  <ListView
    count={types.length}
    {selection}
    on:click={(evt) => {
      select(types[evt.detail])
    }}
    updateOnMouse={false}
  >
    <svelte:fragment slot="item" let:item>
      {@const typeItem = types[item]}
      <div class="flex-row flex-between p-1">
        <div class="flex-col">
          <div class="flex-row-center">
            {#if typeItem.$lookup?.descriptor?.icon}
              <div class="p-1">
                <Component is={typeItem.$lookup?.descriptor?.icon} props={{ size: 'medium' }} />
              </div>
            {/if}
            {typeItem.name}
          </div>
          {#if typeItem.$lookup?.descriptor}
            <div class="text-sm">
              <Label label={typeItem.$lookup?.descriptor.name} />
            </div>
          {/if}
        </div>
      </div>
    </svelte:fragment>
  </ListView>
</div>
