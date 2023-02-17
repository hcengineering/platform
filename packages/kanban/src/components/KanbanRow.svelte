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
  import { Doc, Ref } from '@hcengineering/core'
  import { createEventDispatcher } from 'svelte'
  import { slide } from 'svelte/transition'
  import { CardDragEvent, Item, TypeState } from '../types'

  export let stateObjects: Item[]
  export let isDragging: boolean
  export let dragCard: Item | undefined
  export let objects: Item[]
  export let selection: number | undefined = undefined
  export let checkedSet: Set<Ref<Doc>>
  export let state: TypeState

  export let cardDragOver: (evt: CardDragEvent, object: Item) => void
  export let cardDrop: (evt: CardDragEvent, object: Item) => void
  export let onDragStart: (object: Item, state: TypeState) => void
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
</script>

{#each stateObjects as object, i}
  {@const dragged = isDragging && object._id === dragCard?._id}
  <div
    bind:this={stateRefs[i]}
    transition:slideD|local={{ isDragging }}
    class="step-tb75"
    on:dragover|preventDefault={(evt) => cardDragOver(evt, object)}
    on:drop|preventDefault={(evt) => cardDrop(evt, object)}
  >
    <div
      class="card-container"
      class:selection={selection !== undefined ? objects[selection]?._id === object._id : false}
      class:checked={checkedSet.has(object._id)}
      on:mouseover={() => dispatch('obj-focus', object)}
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
      <slot name="card" object={toAny(object)} {dragged} />
    </div>
  </div>
{/each}

<style lang="scss">
  .card-container {
    background-color: var(--board-card-bg-color);
    border-radius: 0.25rem;
    // transition: box-shadow .15s ease-in-out;

    &:hover {
      background-color: var(--board-card-bg-hover);
    }
    &.checked {
      background-color: var(--highlight-select);
      box-shadow: inset 0 0 1px 1px var(--highlight-select-border);

      &:hover {
        background-color: var(--highlight-select-hover);
      }
    }
    &.selection,
    &.checked.selection {
      box-shadow: inset 0 0 1px 1px var(--primary-bg-color);
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
      background-color: var(--board-bg-color);
    }
  }
  @keyframes anim-border {
    from {
      box-shadow: inset 0 0 1px 1px var(--primary-edit-border-color);
    }
    to {
      box-shadow: inset 0 0 1px 1px var(--primary-bg-color);
    }
  }
</style>
