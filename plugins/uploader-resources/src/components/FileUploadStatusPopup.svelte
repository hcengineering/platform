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
  import { Button, IconClose, ProgressCircle, Label, humanReadableFileSize } from '@hcengineering/ui'
  import uploader, { FileUpload } from '@hcengineering/uploader'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import type { UppyFile, State as UppyState } from '@uppy/core'
  import { onDestroy, onMount } from 'svelte'

  export let upload: FileUpload

  let state: UppyState = upload.uppy.getState()

  $: files = Object.values(state.files)

  function handleUploadProgress (): void {
    state = upload.uppy.getState()
  }

  function handleFileRemoved (): void {
    state = upload.uppy.getState()
  }

  function handleCancelFile (file: UppyFile): void {
    upload.uppy.removeFile(file.id)
  }

  onMount(() => {
    upload.uppy.on('upload-progress', handleUploadProgress)
    upload.uppy.on('file-removed', handleFileRemoved)
  })

  onDestroy(() => {
    upload.uppy.off('upload-progress', handleUploadProgress)
    upload.uppy.off('file-removed', handleFileRemoved)
  })
</script>

<div class="antiPopup upload-popup">
  <div class="upload-popup__header flex-row-center flex-gap-2">
    <ObjectPresenter
      value={upload.target.space}
      shouldShowAvatar={false}
      accent
    />
    <ObjectPresenter
      objectId={upload.target.objectId}
      _class={upload.target.objectClass}
      shouldShowAvatar={false}
      accent
    />
  </div>
  <div class="flex-col flex-gap-4">
    {#each files as file}
      {#if file.progress}
        <div class="upload-file-row flex-row-center justify-start flex-gap-4">
          <div class="upload-file-row__status">
            <ProgressCircle value={file.progress.percentage} size={'small'} primary />
          </div>

          <div class="upload-file-row__content flex-col flex-gap-1">
            <div class="label overflow-label">{file.name}</div>
            <div class="flex-row-center flex-gap-2 text-sm">
              {#if file.progress.uploadStarted}
                {#if file.progress.uploadComplete}
                  <Label label={uploader.status.Completed} />
                  <span>{humanReadableFileSize(file.progress.bytesTotal)}</span>
                {:else}
                  <Label label={uploader.status.Uploading} />
                  <span>{humanReadableFileSize(file.progress.bytesUploaded)} / {humanReadableFileSize(file.progress.bytesTotal)}</span>
                {/if}
              {:else}
                <Label label={uploader.status.Waiting} />
                <span>{humanReadableFileSize(file.progress.bytesTotal)}</span>
              {/if}
            </div>
          </div>

          <div class="upload-file-row__tools w-6">
            {#if !file.progress.uploadComplete }
              <Button
                kind={'icon'}
                icon={IconClose}
                iconProps={{ size: 'small' }}
                showTooltip={{ label: uploader.string.Cancel }}
                on:click={() => {
                  handleCancelFile(file)
                }}
              />
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style lang="scss">
  .upload-popup {
    padding: var(--spacing-2);

    .upload-popup__header {
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--divider-color);
    }
  }

  .upload-file-row {
    .upload-file-row__content {
      flex-grow: 2;
    }
  }
</style>
