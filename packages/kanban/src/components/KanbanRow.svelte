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
  import { CategoryType, Doc, Ref } from '@hcengineering/core'
  import ui, { Button, IconMoreH, Lazy, mouseAttractor } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'
  import { CardDragEvent, DocWithRank, Item } from '../types'
  import Spinner from '@hcengineering/ui/src/components/Spinner.svelte'

  export let stateObjects: Item[]
  export let isDragging: boolean
  export let dragCard: Item | undefined
  export let objects: Item[]
  export let groupByDocs: Record<string | number, Item[]>
  export let selection: number | undefined = undefined
  export let checkedSet: Set<Ref<Doc>>
  export let state: CategoryType
  export let index: number

  export let cardDragOver: (evt: CardDragEvent, object: Item) => void
  export let cardDrop: (evt: CardDragEvent, object: Item) => void
  export let onDragStart: (object: Item, state: CategoryType) => void
  export let showMenu: (evt: MouseEvent, object: Item) => void

  const dispatch = createEventDispatcher()

  function toAny (object: any): any {
    return object
  }

  const slideD = (node: any, args: any) => (args.isDragging ? slide(node, args) : {})

  const stateRefs: HTMLElement[] = []

  $: stateRefs.length = stateObjects.length
  export function scroll (item: Item): void {
    const pos = stateObjects.findIndex((it) => it._id === item._id)
    if (pos >= 0) {
      stateRefs[pos]?.scrollIntoView({ behavior: 'auto', block: 'nearest' })
    }
  }

  let limit = 50

  let limitedObjects: DocWithRank[] = []
  let loading = false
  let loadingTimeout: any | undefined = undefined

  function update (stateObjects: Item[], limit: number | undefined, index: number): void {
    clearTimeout(loadingTimeout)
    if (limitedObjects.length > 0 || index === 0) {
      limitedObjects = stateObjects.slice(0, limit)
    } else {
      loading = true
      loadingTimeout = setTimeout(() => {
        limitedObjects = stateObjects.slice(0, limit)
        loading = false
      }, index)
    }
  }

  $: update(stateObjects, limit, index)
</script>

{#each limitedObjects as object, i (object._id)}
  {@const dragged = isDragging && object._id === dragCard?._id}
  <div
    bind:this={stateRefs[i]}
    transition:slideD|local={{ isDragging }}
    class="p-1 flex-no-shrink border-radius-1 clear-mins"
    on:dragover|preventDefault={(evt) => cardDragOver(evt, object)}
    on:drop|preventDefault={(evt) => cardDrop(evt, object)}
  >
    <div
      class="card-container"
      class:selection={selection !== undefined ? objects[selection]?._id === object._id : false}
      class:checked={checkedSet.has(object._id)}
      on:mouseover={mouseAttractor(() => dispatch('obj-focus', object))}
      on:mouseenter={mouseAttractor(() => dispatch('obj-focus', object))}
      on:focus={() => {}}
      on:contextmenu={(evt) => showMenu(evt, object)}
      draggable={true}
      class:draggable={true}
      on:dragstart
      on:dragend
      class:dragged
      on:dragstart={() => onDragStart(object, state)}
      on:dragend={() => {
        isDragging = false
      }}
    >
      <Lazy>
        <slot name="card" object={toAny(object)} {dragged} />
      </Lazy>
    </div>
  </div>
{/each}
{#if stateObjects.length > limitedObjects.length}
  <div class="p-1 flex-no-shrink clear-mins">
    {#if loading}
      <Spinner />
    {:else}
      <div class="card-container flex-between p-4">
        <span class="caption-color">{limitedObjects.length}</span> / {stateObjects.length}
        <Button
          size={'small'}
          icon={IconMoreH}
          label={ui.string.ShowMore}
          on:click={() => {
            limit = limit + 20
          }}
        />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .card-container {
    background-color: var(--theme-kanban-card-bg-color);
    border: 1px solid var(--theme-kanban-card-border);
    border-radius: 0.25rem;
    // transition: box-shadow .15s ease-in-out;

    // &:hover {
    //   background-color: var(--highlight-hover);
    // }
    &.checked {
      background-color: var(--highlight-select);
      box-shadow: 0 0 1px 1px var(--highlight-select-border);

      &:hover {
        background-color: var(--highlight-select-hover);
      }
    }
    &.selection,
    &.checked.selection {
      box-shadow: 0 0 1px 1px var(--accented-button-default);
      animation: anim-border 1s ease-in-out;

      &:hover {
        background-color: var(--highlight-hover);
      }
    }
    &.checked.selection:hover {
      background-color: var(--highlight-select-hover);
    }

    &.draggable {
      cursor: grab;
    }
    &.dragged {
      background-color: var(--theme-bg-accent-color);
    }
  }
  @keyframes anim-border {
    from {
      box-shadow: 0 0 1px 1px var(--primary-edit-border-color);
    }
    to {
      box-shadow: 0 0 1px 1px var(--primary-bg-color);
    }
  }
</style>
