<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import type { IntlString } from '@hcengineering/platform'
  import type { WithLookup } from '@hcengineering/core'
  import type { ToDo } from '@hcengineering/time'
  import { createEventDispatcher } from 'svelte'
  import { dragging } from '../dragging'
  import time from '../plugin'

  export let todo: WithLookup<ToDo>
  export let index: number
  export let groupName: IntlString | null
  export let projectId: string | false | null

  const dispatch = createEventDispatcher()

  let isDragging: boolean = false
  let draggingOverClass: string = ''

  $: draggingItemIndex = $dragging.itemIndex
  $: draggingGroupName = $dragging.groupName
  $: draggingProjectId = $dragging.projectId
  $: draggingOverIndex = $dragging.overItemIndex
  $: draggingOverGroupName = $dragging.overGroupName
  $: draggingOverProjectId = $dragging.overProjectId

  $: isDraggable = groupName !== time.string.Done

  $: {
    if (
      isDraggable &&
      draggingItemIndex !== null &&
      draggingOverGroupName === groupName &&
      draggingGroupName === groupName &&
      draggingOverProjectId === projectId &&
      draggingProjectId === projectId &&
      index === draggingOverIndex
    ) {
      draggingOverClass = index < draggingItemIndex ? 'is-dragging-over-up' : 'is-dragging-over-down'
    } else {
      draggingOverClass = ''
    }
  }

  function handleDragStart (event: DragEvent): void {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
    }
    isDragging = true
    dragging.update((state) => ({
      ...state,
      item: todo,
      itemIndex: index,
      groupName,
      projectId
    }))
  }

  function handleDragEnd (): void {
    isDragging = false
    dragging.set({
      item: null,
      itemIndex: null,
      groupName: null,
      projectId: null,
      overItemIndex: null,
      overGroupName: null,
      overProjectId: null
    })
  }

  function handleDragOver (): void {
    if (!isDraggable) return
    dragging.update((state) => ({
      ...state,
      overItemIndex: index,
      overGroupName: groupName,
      overProjectId: projectId
    }))
  }

  function handleDrop (event: DragEvent): void {
    if (!isDraggable) return
    dispatch('drop', { event, index })
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="hulyToDoLine-draggable {draggingOverClass} step-tb125"
  class:dragging={isDragging}
  draggable={true}
  on:dragstart={handleDragStart}
  on:dragend={handleDragEnd}
  on:dragover|preventDefault={handleDragOver}
  on:drop={handleDrop}
>
  <slot />
</div>
