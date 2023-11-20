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
  import core, { IdMap, Ref, Status, StatusCategory } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
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
  export let shouldShowAvatar = true
  export let inline: boolean = false
  export let disabled: boolean = false
  export let oneLine: boolean = false
  export let shouldShowName: boolean = true
  export let shouldShowTooltip: boolean = false
  export let noUnderline: boolean = false
  export let shrink: number = 0
  export let space: Ref<Project>

  const dispatch = createEventDispatcher()

  $: color = viewState
    ? getPlatformColorDef(viewState.color ?? category?.color ?? getColorNumberByText(viewState.name), $themeStore.dark)
    : undefined
  const dispatchAccentColor = (color?: ColorDefinition) => {
    dispatch('accent-color', color)
  }

  $: dispatchAccentColor(color)

  onMount(() => {
    dispatchAccentColor(color)
  })

  function getViewState (type: ProjectType | undefined, state: Status | undefined): Status | undefined {
    if (state === undefined) return
    if (type === undefined) return state
    const targetColor = type.statuses.find((p) => p._id === state._id)?.color
    if (targetColor === undefined) return state
    return {
      ...state,
      color: targetColor
    }
  }

  let category: StatusCategory | undefined
  $: updateCategory(value)

  async function updateCategory (value: Status | undefined) {
    if (value === undefined) return
    category = await client.findOne(core.class.StatusCategory, { _id: value.category })
  }

  $: viewState = getViewState(type, value)

  let type: ProjectType | undefined = undefined

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
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="flex-presenter"
    class:inline-presenter={inline}
    class:flex-no-shrink={!shouldShowName || shrink === 0}
    on:click
  >
    {#if shouldShowAvatar}
      <div
        class="state-container"
        class:inline
        class:mr-2={shouldShowName}
        style:background-color={color?.color ?? defaultBackground($themeStore.dark)}
        title={shouldShowTooltip ? value.name : undefined}
      />
    {/if}
    {#if shouldShowName}
      <span class="overflow-label label" class:nowrap={oneLine} class:no-underline={noUnderline || disabled}>
        {value.name}
      </span>
    {/if}
  </div>
{/if}

<style lang="scss">
  .state-container {
    flex-shrink: 0;
    width: 0.875rem;
    height: 0.875rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;

    &.inline {
      transform: translateY(0.125rem);
    }
  }
</style>
