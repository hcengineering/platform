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
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { ProgressCircle, showPopup, tooltip } from '@hcengineering/ui'

  import { type Upload } from '../store'

  import IconError from './icons/Error.svelte'
  import FileUploadStatusPopup from './FileUploadStatusPopup.svelte'

  export let upload: Upload

  $: console.log(upload.progress / Math.max(upload.files.size, 1))

  function handleClick (ev: MouseEvent): void {
    showPopup(FileUploadStatusPopup, { uploadId: upload.uuid }, ev.currentTarget as HTMLElement)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="container flex-row-center flex-gap-2 active"
  class:error={upload.error}
  on:click={handleClick}
  use:tooltip={upload.error !== undefined ? { label: getEmbeddedLabel(upload.error) } : undefined}
>
  {#if upload.error}
    <IconError size={'small'} fill={'var(--negative-button-default)'} />
  {:else}
    <ProgressCircle value={(upload.progress / Math.max(upload.files.size, 1))} size={'small'} primary />
  {/if}
  <span>{(upload.progress / Math.max(upload.files.size, 1)).toFixed(1)}%</span>
</div>

<style lang="scss">
  .container {
    padding: 0.125rem 0.5rem;
    height: 1.625rem;
    font-weight: 500;
    background-color: var(--theme-button-pressed);
    border: 1px solid transparent;
    border-radius: 0.25rem;
    cursor: pointer;

    &:hover {
      background-color: var(--theme-button-hovered);
      border-color: var(--theme-navpanel-divider);
    }

    &.active {
      order: -1;
      position: relative;
      display: flex;
      align-items: center;
      padding: 0.125rem 0.5rem;
      background-color: var(--highlight-select);
      border-color: var(--highlight-select-border);

      &:hover {
        background-color: var(--highlight-select-hover);
      }
    }

    &.error {
      background-color: var(--system-error-60-color);

      &:hover {
        background-color: var(--system-error-60-color);
      }
    }
  }
</style>
