<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Asset, IntlString } from '@hcengineering/platform'
  import { Icon, IconSize, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { flip } from 'svelte/animate'

  export let items: any[]
  export let label: IntlString | undefined = undefined
  export let direction: 'row' | 'column' = 'column'
  export let flipDuration = 200
  export let itemsCount = 0
  export let icon: Asset | undefined = undefined
  export let iconSize: IconSize = 'small'

  const areItemsSorting = false

  let draggingIndex: number | null = null
  let hoveringIndex: number | null = null

  function handleDragStart (ev: DragEvent, itemIndex: number) {
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'
    }

    draggingIndex = itemIndex
  }

  function handleDragOver (ev: DragEvent, itemIndex: number) {
    ev.preventDefault()

    hoveringIndex = itemIndex
  }

  const dispatch = createEventDispatcher()

  async function handleDrop (itemIndex: number) {
    if (draggingIndex !== null && draggingIndex !== itemIndex) {
      const item = items[draggingIndex]
      const [prev, next] = [
        items[draggingIndex < itemIndex ? itemIndex : itemIndex - 1],
        items[draggingIndex < itemIndex ? itemIndex + 1 : itemIndex]
      ]

      items.splice(itemIndex, 0, items.splice(draggingIndex, 1)[0])

      dispatch('move', { item, prev, next, items })
    }

    resetDrag()
  }

  function resetDrag () {
    draggingIndex = null
    hoveringIndex = null
  }

  $: itemsCount = items?.length ?? 0

  $: isVertical = direction === 'column'

  $: isDraggable = items.length > 1 && !areItemsSorting
</script>

<div class="flex-col" class:w-full={isVertical}>
  {#if label}
    <div class="flex mb-4">
      {#if icon}
        <div class="mr-2 flex-center">
          <Icon {icon} size={iconSize} />
        </div>
      {/if}
      {#if label}
        <div class="title-wrapper">
          <span class="wrapped-title text-base caption-color">
            <Label {label} />
          </span>
        </div>
      {/if}
    </div>
  {/if}

  {#if $$slots.object && items}
    <div class="flex-gap-1" class:flex-col={isVertical} class:flex={!isVertical} class:flex-wrap={!isVertical}>
      {#each items as item, index (item._id)}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="item"
          class:column={isVertical}
          class:row={!isVertical}
          class:is-dragged-over-before={draggingIndex !== null && index === hoveringIndex && index < draggingIndex}
          class:is-dragged-over-after={draggingIndex !== null && index === hoveringIndex && index > draggingIndex}
          draggable={isDraggable}
          animate:flip={{ duration: flipDuration }}
          on:dragstart={(ev) => {
            handleDragStart(ev, index)
          }}
          on:dragover={(ev) => {
            handleDragOver(ev, index)
          }}
          on:drop={async () => {
            await handleDrop(index)
          }}
          on:dragend={resetDrag}
        >
          <slot name="object" value={item} {isDraggable} />
        </div>
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  .item {
    position: relative;

    &.is-dragged-over-before::before,
    &.is-dragged-over-after::before {
      position: absolute;
      content: '';
      inset: 0;
    }

    &.column.is-dragged-over-before::before {
      border-top: 1px solid var(--theme-caret-color);
    }
    &.column.is-dragged-over-after::before {
      border-bottom: 1px solid var(--theme-caret-color);
    }
    &.row.is-dragged-over-before::before {
      border-left: 1px solid var(--theme-caret-color);
    }
    &.row.is-dragged-over-after::before {
      border-right: 1px solid var(--theme-caret-color);
    }
  }
</style>
