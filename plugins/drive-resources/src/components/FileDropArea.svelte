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
  import { type Ref, type Space } from '@hcengineering/core'
  import { type Drive, type Folder } from '@hcengineering/drive'
  import { uploadFilesToDrive } from '../utils'

  export let space: Ref<Drive>
  export let parent: Ref<Folder>
  export let canDrop: ((e: DragEvent) => boolean) | undefined = undefined

  let dragover = false
  let counter = 0

  async function handleDragEnter (): Promise<void> {
    counter++
  }

  async function handleDragLeave (): Promise<void> {
    if (counter > 0) {
      counter--
    }
    if (counter === 0) {
      dragover = false
    }
  }

  async function handleDragOver (e: DragEvent): Promise<void> {
    if (e.dataTransfer?.files === undefined) {
      return
    }
    if (canDrop !== undefined && !canDrop(e)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    dragover = true
  }

  async function handleDrop (e: DragEvent): Promise<void> {
    counter = 0
    dragover = false

    if (canDrop !== undefined && !canDrop(e)) {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer != null) {
      await uploadFilesToDrive(e.dataTransfer, space, parent)
    }
  }
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="dropzone flex-col w-full h-full"
  class:dragover
  on:dragenter={handleDragEnter}
  on:dragleave={handleDragLeave}
  on:dragover|preventDefault={handleDragOver}
  on:drop={handleDrop}
>
  <slot />
</div>

<style lang="scss">
  .dropzone {
    position: relative;

    &::after {
      position: absolute;
      inset: 0;
      background-color: var(--primary-button-transparent);
      border: 2px dashed var(--primary-button-outline);
      pointer-events: none;
    }
    &.dragover::after {
      content: '';
    }
  }
</style>
