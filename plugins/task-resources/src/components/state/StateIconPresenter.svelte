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
  import core, { IdMap, Ref, Status, StatusCategory } from '@hcengineering/core'
  import { getClient, reduceCalls } from '@hcengineering/presentation'
  import task, { Project, ProjectType } from '@hcengineering/task'
  import {
    ColorDefinition,
    defaultBackground,
    getColorNumberByText,
    getPlatformColorDef,
    themeStore
  } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import { typeStore } from '../..'

  export let value: Status | undefined
  export let shouldShowTooltip: boolean = false
  export let space: Ref<Project>

  const client = getClient()
  const dispatch = createEventDispatcher()

  let category: StatusCategory | undefined
  let type: ProjectType | undefined = undefined

  const update = reduceCalls(async function (
    value: Status | undefined,
    space: Ref<Project>,
    typeStore: IdMap<ProjectType>
  ) {
    await updateCategory(value)
    await getType(space, typeStore)
  })

  $: void update(value, space, $typeStore)

  $: viewState = getViewState(type, value)

  $: color = viewState
    ? getPlatformColorDef(viewState.color ?? category?.color ?? getColorNumberByText(viewState.name), $themeStore.dark)
    : undefined

  function getViewState (type: ProjectType | undefined, state: Status | undefined): Status | undefined {
    if (state === undefined) return
    if (type === undefined) return state
    const statusColor = type?.statuses?.find((p) => p._id === state._id)?.color
    const targetColor =
      statusColor === undefined || typeof statusColor !== 'string' ? statusColor : state.color ?? category?.color
    if (targetColor === undefined) return state
    return {
      ...state,
      color: targetColor
    }
  }

  async function updateCategory (value: Status | undefined): Promise<void> {
    if (value === undefined) return
    category = await client.findOne(core.class.StatusCategory, { _id: value.category })
  }

  async function getType (space: Ref<Project>, types: IdMap<ProjectType>): Promise<ProjectType | undefined> {
    const _space = await client.findOne(task.class.Project, { _id: space })
    if (_space === undefined) {
      type = undefined
      return
    }
    type = types.get(_space.type)
  }

  const dispatchAccentColor = (color?: ColorDefinition) => {
    dispatch('accent-color', color)
  }
  $: dispatchAccentColor(color)

  onMount(() => {
    dispatchAccentColor(color)
  })
</script>

<div
  class="state-container"
  style:background-color={color?.color ?? defaultBackground($themeStore.dark)}
  title={shouldShowTooltip ? value?.name : undefined}
/>

<style lang="scss">
  .state-container {
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
  }
</style>
