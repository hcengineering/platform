<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { resizeObserver } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  export let key: string | undefined = undefined
  // expected to be bound outside
  export let dragging = false
  export let posX: number = 0
  export let posY: number = 0

  // distances to the edges of the screen
  let right: number = document.body.clientWidth
  let top: number = document.body.clientHeight
  let bottom: number = 0
  let left: number = 0

  // drag start position
  let dragStartX = 0
  let dragStartY = 0
  // drag offset
  let dragOffsetX = 0
  let dragOffsetY = 0

  // window and client sizes
  let clientWidth = 0
  let clientHeight = 0
  let windowClientWidth = document.body.clientWidth
  let windowClientHeight = document.body.clientHeight

  // On mount, restore saved position
  onMount(() => {
    if (key === undefined) return
    const saved = localStorage.getItem(key)
    if (saved != null) {
      try {
        const { l, r, t, b } = JSON.parse(saved)
        if (typeof l === 'number' && typeof r === 'number' && typeof t === 'number' && typeof b === 'number') {
          left = l
          right = r
          top = t
          bottom = b
        }
      } catch {}
    }
  })

  onMount(() => {
    const observer = new ResizeObserver(() => {
      windowClientWidth = document.body.clientWidth
      windowClientHeight = document.body.clientHeight
    })
    observer.observe(document.body)

    return () => {
      observer.disconnect()
    }
  })

  function handleDragStart (event: MouseEvent): void {
    dragStartX = event.clientX
    dragStartY = event.clientY
    dragOffsetX = event.clientX - posX
    dragOffsetY = event.clientY - posY

    window.addEventListener('mousemove', handleDrag)
    window.addEventListener('mouseup', handleDragEnd)
  }

  function handleDragEnd (): void {
    window.removeEventListener('mousemove', handleDrag)
    window.removeEventListener('mouseup', handleDragEnd)

    if (dragging && key !== undefined) {
      try {
        localStorage.setItem(key, JSON.stringify({ l: left, r: right, t: top, b: bottom }))
      } catch {}
    }
    dragging = false
  }

  function handleDrag (event: MouseEvent): void {
    if (!dragging) {
      if (Math.abs(event.clientX - dragStartX) < 5 && Math.abs(event.clientY - dragStartY) < 5) {
        return
      }

      dragging = true
    }

    const x = event.clientX - dragOffsetX
    const y = event.clientY - dragOffsetY

    // When dragging, update distances to the edges of the screen
    top = Math.max(windowClientHeight / 2 + y, 0)
    bottom = Math.max(windowClientHeight / 2 - y - clientHeight, 0)
    left = Math.max(windowClientWidth / 2 + x, 0)
    right = Math.max(windowClientWidth / 2 - x - clientWidth, 0)
  }

  // Calculate the popup position based on the distances to the edges of the screen
  $: posX = left < right ? left - windowClientWidth / 2 : windowClientWidth / 2 - clientWidth - right
  $: posY = top < bottom ? top - windowClientHeight / 2 : windowClientHeight / 2 - clientHeight - bottom

  // Position the element based on the distances to the edges of the screen
  // If it is closer to the left edge, position it to the left, otherwise position it to the right
  // If it is closer to the top edge, position it to the top, otherwise position it to the bottom
  $: styleX = left < right ? `left: ${left - windowClientWidth / 2}px;` : `right: ${right - windowClientWidth / 2}px;`
  $: styleY = top < bottom ? `top: ${top - windowClientHeight / 2}px;` : `bottom: ${bottom - windowClientHeight / 2}px;`
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="draggable"
  class:dragging
  style="{styleX} {styleY}"
  on:mousedown={handleDragStart}
  on:mouseup={handleDragEnd}
  on:click={handleDragEnd}
  use:resizeObserver={(element) => {
    clientWidth = element.clientWidth
    clientHeight = element.clientHeight
  }}
>
  <slot />
</div>

<style lang="scss">
  .draggable {
    position: absolute;
    cursor: grab;
    user-select: none;

    &.dragging {
      cursor: grabbing;
    }
  }
</style>
