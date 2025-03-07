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
  import Camera from './Camera.svelte'
  import Panel from './Panel.svelte'
  import { createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher()
  const pos = { x: 0, y: 0, offsetX: 0, offsetY: 0 }
  let dragging = false

  function startDrag (event: MouseEvent): void {
    dragging = true
    pos.offsetX = event.clientX - pos.x
    pos.offsetY = event.clientY - pos.y
  }

  function stopDrag (): void {
    dragging = false
  }

  function onClose (res: any): void {
    dispatch('close', res.detail)
  }

  function handleDrag (event: MouseEvent): void {
    if (dragging) {
      pos.x = event.clientX - pos.offsetX
      pos.y = event.clientY - pos.offsetY
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="container"
  style="left: {pos.x}px; top: {pos.y}px;"
  on:mousedown={startDrag}
  on:mousemove={handleDrag}
  on:mouseup={stopDrag}
  on:mouseleave={stopDrag}
>
  <Camera />
  <Panel on:close={onClose} />
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    position: absolute;
    cursor: grab;
    user-select: none;
    gap: 0.5rem;
    padding: 0.5rem;
  }
  .container:active {
    cursor: grabbing;
  }
</style>
