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
  import { flip } from 'svelte/animate'

  import { Doc } from '@hcengineering/core'

  import { IconMoreV } from '@hcengineering/ui'
  import { getClient } from '../utils'

  type DocWithRank = Doc & { rank: string }

  export let objects: Doc[] | DocWithRank[]
  export let handleMove: ((fromIndex: number, toIndex: number) => void) | undefined = undefined
  export let calcRank: (doc: DocWithRank, next: DocWithRank) => string
  export let showContextMenu: ((evt: MouseEvent, doc: Doc) => void) | undefined = undefined

  const client = getClient()

  let draggingIndex: number | null = null
  let hoveringIndex: number | null = null
  let dragOverIndex: number = -1

  function resetDrag () {
    draggingIndex = null
    hoveringIndex = null
    dragOverIndex = -1
  }

  function handleDragStart (ev: DragEvent, index: number) {
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'
      draggingIndex = index
    }
  }

  function checkHasRank (objects: Doc[] | (Doc & { rank: string })[]): objects is (Doc & { rank: string })[] {
    return 'rank' in objects[0]
  }

  async function handleDrop (ev: DragEvent, toIndex: number) {
    if (ev.dataTransfer && draggingIndex !== null && toIndex !== draggingIndex) {
      ev.dataTransfer.dropEffect = 'move'

      if (handleMove) {
        handleMove(draggingIndex, toIndex)
        return
      }
      if (!checkHasRank(objects)) {
        return
      }
      const [prev, next] = [
        objects[draggingIndex < toIndex ? toIndex : toIndex - 1],
        objects[draggingIndex < toIndex ? toIndex + 1 : toIndex]
      ]
      const object = objects[draggingIndex]

      await client.update(object, { rank: calcRank(prev, next) })
    }
    resetDrag()
  }
</script>

<div class="antiAccordion">
  {#each objects as object, index (object._id)}
    <div class="description pb-1" animate:flip={{ duration: 400 }}>
      <div
        class:is-dragging={index === draggingIndex}
        class:is-dragged-over-up={draggingIndex !== null && index < draggingIndex && index === hoveringIndex}
        class:is-dragged-over-down={draggingIndex !== null && index > draggingIndex && index === hoveringIndex}
        class:drag-over-highlight={index === dragOverIndex}
        draggable={true}
        on:contextmenu|preventDefault={(ev) => showContextMenu?.(ev, object)}
        on:dragstart={(ev) => handleDragStart(ev, index)}
        on:dragover|preventDefault={() => {
          dragOverIndex = index
          return false
        }}
        on:dragenter={() => (hoveringIndex = index)}
        on:drop|preventDefault={(ev) => handleDrop(ev, index)}
        on:dragend={resetDrag}
      >
        <div class="draggable-container">
          <div class="caption mb-0 flex flex-grow flex-row-center">
            <div class="draggable-mark fs-title dark-color whitespace-nowrap mr-2"><IconMoreV size={'small'} /></div>
            <div class="fs-title dark-color whitespace-nowrap mr-2">
              {`${index + 1}.`}
            </div>
            <slot name="object" {index} />
          </div>
          <slot name="object-footer" {index} />
        </div>
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .drag-over-highlight {
    opacity: 0.2;
  }
  .description {
    .draggable-container {
      cursor: grabbing;
    }

    &:hover {
      .draggable-mark {
        opacity: 0.4;
      }
    }
  }
</style>
