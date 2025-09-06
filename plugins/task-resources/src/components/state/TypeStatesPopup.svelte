<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import core, { IdMap, Ref, Status, StatusCategory, toIdMap } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { ProjectType, TaskType } from '@hcengineering/task'
  import {
    ColorDefinition,
    getColorNumberByText,
    getPlatformColorDef,
    resizeObserver,
    themeStore
  } from '@hcengineering/ui'
  import { statusStore } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { typeStore } from '../..'

  export let space: Ref<ProjectType>
  export let taskType: TaskType | undefined = undefined

  $: states = getStates($statusStore.byId, type, taskType)

  function getStates (
    statusStore: IdMap<Status>,
    type: ProjectType | undefined,
    taskType: TaskType | undefined
  ): Status[] {
    if (type === undefined) return []

    let res = type.statuses.map((p) => statusStore.get(p._id)).filter((p) => p !== undefined)
    if (taskType !== undefined) {
      res = res.filter((p) => taskType.statuses.includes(p._id))
    }
    return res
  }

  const dispatch = createEventDispatcher()

  function getColor (state: Status, type: ProjectType | undefined, categories: IdMap<StatusCategory>): ColorDefinition {
    const category = state.category ? categories.get(state.category) : undefined
    const statusColor = type?.statuses?.find((p) => p._id === state._id)?.color
    const targetColor =
      statusColor === undefined || typeof statusColor !== 'string' ? statusColor : state.color ?? category?.color
    return getPlatformColorDef(targetColor ?? getColorNumberByText(state.name), $themeStore.dark)
  }

  let categories: IdMap<StatusCategory> = new Map()

  const q = createQuery()
  q.query(core.class.StatusCategory, {}, (res) => {
    categories = toIdMap(res)
  })

  let type: ProjectType | undefined = undefined
  $: type = $typeStore.get(space)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#each states as state}
        {@const color = getColor(state, type, categories)}
        <button
          class="menu-item"
          on:click={() => {
            dispatch('close', state)
          }}
        >
          <div class="color" style:background-color={color.color} />
          <span class="label">{state.name}</span>
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
