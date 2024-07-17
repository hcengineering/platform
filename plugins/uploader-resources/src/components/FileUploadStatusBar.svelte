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
  import { type State as UppyState } from '@uppy/core'
  import { onDestroy, onMount } from 'svelte'

  import { type FileUpload } from '../store'

  import IconError from './icons/Error.svelte'
  import FileUploadStatusPopup from './FileUploadStatusPopup.svelte'

  export let upload: FileUpload

  let state: UppyState<any, any> = upload.uppy.getState()
  let progress: number = state.totalProgress

  $: files = Object.values(state.files)
  $: filesTotal = files.length
  $: filesComplete = files.filter((p) => p.progress?.uploadComplete).length

  function handleProgress (totalProgress: number): void {
    progress = totalProgress
  }

  function handleUploadProgress (): void {
    state = upload.uppy.getState()
  }

  function handleUploadSuccess (): void {
    state = upload.uppy.getState()
  }

  function handleFileRemoved (): void {
    state = upload.uppy.getState()
  }

  function handleError (): void {
    state = upload.uppy.getState()
  }

  onMount(() => {
    upload.uppy.on('error', handleError)
    upload.uppy.on('progress', handleProgress)
    upload.uppy.on('upload-progress', handleUploadProgress)
    upload.uppy.on('upload-success', handleUploadSuccess)
    upload.uppy.on('file-removed', handleFileRemoved)
  })

  onDestroy(() => {
    upload.uppy.off('error', handleError)
    upload.uppy.off('progress', handleProgress)
    upload.uppy.off('upload-progress', handleUploadProgress)
    upload.uppy.off('upload-success', handleUploadSuccess)
    upload.uppy.off('file-removed', handleFileRemoved)
  })

  function handleClick (ev: MouseEvent): void {
    showPopup(FileUploadStatusPopup, { upload }, ev.currentTarget as HTMLElement)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="container flex-row-center flex-gap-2 active"
  class:error={state.error}
  on:click={handleClick}
  use:tooltip={
    state.error != null
      ? { label: getEmbeddedLabel(state.error) }
      : undefined
  }
>
  {#if state.error}
    <IconError size={'small'} fill={'var(--theme-error-color)'} />
  {:else}
    <ProgressCircle value={progress} size={'small'} primary />
  {/if}
  <span>{progress}%</span>
  {#if filesTotal > 0}
    <span>{filesComplete}/{filesTotal}</span>
  {/if}
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
