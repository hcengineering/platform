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
  import { IdMap, Ref, Status } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import task, { Project, ProjectType } from '@hcengineering/task'
  import { resizeObserver } from '@hcengineering/ui'
  import { ObjectPresenter, statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { typeStore } from '../..'

  export let space: Ref<Project>

  $: states = type
    ? ($typeStore
        .get(type._id)
        ?.statuses?.map((p) => $statusStore.byId.get(p._id))
        .filter((p) => p !== undefined) as Status[]) ?? []
    : []
  const dispatch = createEventDispatcher()

  $: getType(space, $typeStore)

  const client = getClient()

  async function getType (space: Ref<Project>, types: IdMap<ProjectType>): Promise<ProjectType | undefined> {
    const _space = await client.findOne(task.class.Project, { _id: space })
    if (_space === undefined) {
      type = undefined
      return
    }
    type = types.get(_space.type)
  }
  let type: ProjectType | undefined = undefined
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#each states as state}
        <button
          class="menu-item"
          on:click={() => {
            dispatch('close', state)
          }}
        >
          <ObjectPresenter
            _class={state._class}
            objectId={state._id}
            value={state}
            props={{ projectType: type?._id }}
          />
          <!-- <div class="color" style:background-color={color.color} />
          <span class="label">{state.name}</span> -->
        </button>
      {/each}
    </div>
  </div>
  <div class="menu-space" />
</div>

<style lang="scss">
  .color {
    flex-shrink: 0;
    margin-right: 0.75rem;
    width: 1rem;
    height: 1rem;
    border-radius: 0.25rem;
  }
</style>
