<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { Button, MiniToggle } from '@hcengineering/ui'
  import { IconFile as FileIcon, IconAttachment, Spinner } from '@hcengineering/ui'
  import { FilePreviewPopup } from '@hcengineering/presentation'
  import { showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../../plugin'

  export let object: any
  export let loading = false
  export let dragover = false
  export let shouldCreateNewSkills = false
  export let inputFile: HTMLInputElement

  function drop(event: DragEvent): void {
    dragover = false
    const droppedFile = event.dataTransfer?.files[0]
    if (droppedFile !== undefined) {
      dispatch('createAttachment', droppedFile)
    }
  }

  function fileSelected(): void {
    const file = inputFile.files?.[0]
    if (file !== undefined) {
      dispatch('createAttachment', file)
    }
  }

  const dispatch = createEventDispatcher()
</script>

<div
  class="flex-center resume"
  class:solid={dragover || object.resumeUuid}
  on:dragover|preventDefault={() => {
    dragover = true
  }}
  on:dragleave={() => {
    dragover = false
  }}
  on:drop|preventDefault|stopPropagation={drop}
>
  {#if loading && object.resumeUuid}
    <Button label={recruit.string.Parsing} icon={Spinner} disabled />
  {:else}
    {#if loading}
      <Button label={recruit.string.Uploading} icon={Spinner} disabled />
    {:else if object.resumeUuid}
      <Button
        disabled={loading}
        focusIndex={103}
        icon={FileIcon}
        on:click={() => {
          showPopup(
            FilePreviewPopup,
            {
              file: object.resumeUuid,
              contentType: object.resumeType,
              name: object.resumeName
            },
            object.resumeType?.startsWith('image/') ? 'centered' : 'float'
          )
        }}
      >
        <svelte:fragment slot="content">
          <span class="overflow-label disabled">{object.resumeName}</span>
        </svelte:fragment>
      </Button>
    {:else}
      <Button
        focusIndex={103}
        label={recruit.string.AddDropHere}
        icon={IconAttachment}
        notSelected
        on:click={() => {
          inputFile.click()
        }}
      />
    {/if}
    <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected} />
  {/if}
  <div class="ml-1">
    <MiniToggle bind:on={shouldCreateNewSkills} label={recruit.string.CreateNewSkills} />
  </div>
</div>

<style lang="scss">
  .resume {
    box-shadow: 0 0 0 0 var(--primary-button-outline);
    border-radius: 0.25rem;
    transition: box-shadow 0.15s ease-in-out;

    &.solid {
      box-shadow: 0 0 0 2px var(--primary-button-outline);
    }
  }
</style> 