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
  import {
    Button,
    IconClose,
    ProgressCircle,
    Label,
    humanReadableFileSize as filesize,
    tooltip
  } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import type { UppyFile, State as UppyState } from '@uppy/core'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import IconCompleted from './icons/Completed.svelte'
  import IconError from './icons/Error.svelte'
  import IconRetry from './icons/Retry.svelte'

  import uploader from '../plugin'
  import { type FileUpload } from '../store'

  export let upload: FileUpload

  const dispatch = createEventDispatcher()

  let state: UppyState<any, any> = upload.uppy.getState()

  $: files = Object.values(state.files)
  $: capabilities = state.capabilities ?? {}
  $: individualCancellation = 'individualCancellation' in capabilities && capabilities.individualCancellation

  function handleComplete (): void {
    if (upload.uppy.getState().error === undefined) {
      dispatch('close')
    }
  }

  function handleUploadError (): void {
    state = upload.uppy.getState()
  }

  function handleUploadProgress (): void {
    state = upload.uppy.getState()
  }

  function handleUploadSuccess (): void {
    state = upload.uppy.getState()
  }

  function handleFileRemoved (): void {
    state = upload.uppy.getState()
    const files = upload.uppy.getFiles()
    if (files.length === 0) {
      dispatch('close')
    }
  }

  function handleCancelFile (file: UppyFile<any, any>): void {
    upload.uppy.removeFile(file.id)
  }

  function handleRetryFile (file: UppyFile<any, any>): void {
    void upload.uppy.retryUpload(file.id)
  }

  onMount(() => {
    upload.uppy.on('complete', handleComplete)
    upload.uppy.on('upload-error', handleUploadError)
    upload.uppy.on('upload-progress', handleUploadProgress)
    upload.uppy.on('upload-success', handleUploadSuccess)
    upload.uppy.on('file-removed', handleFileRemoved)
  })

  onDestroy(() => {
    upload.uppy.off('complete', handleComplete)
    upload.uppy.off('upload-error', handleUploadError)
    upload.uppy.off('upload-progress', handleUploadProgress)
    upload.uppy.off('upload-success', handleUploadSuccess)
    upload.uppy.off('file-removed', handleFileRemoved)
  })

  function getFileError (file: UppyFile<any, any>): string | undefined {
    return 'error' in file ? (file.error as string) : undefined
  }

  function getFilePercentage (file: UppyFile<any, any>): number {
    return file.progress != null
      ? file.progress.uploadComplete
        ? 100
        : file.progress.uploadStarted != null
          ? file.progress.percentage ?? 50
          : 0
      : 0
  }
</script>

<div class="antiPopup upload-popup">
  <div class="upload-popup__header flex-row-center flex-gap-1">
    <Label label={uploader.string.UploadingTo} params={{ files: files.length }} />
    <ObjectPresenter
      objectId={upload.target.objectId}
      _class={upload.target.objectClass}
      shouldShowAvatar={false}
      accent
      noUnderline
    />
  </div>
  <div class="flex-col flex-gap-4">
    {#each files as file}
      {#if file.progress}
        {@const error = getFileError(file)}
        {@const percentage = getFilePercentage(file)}

        <div class="upload-file-row flex-row-center justify-start flex-gap-4">
          <div class="upload-file-row__status w-4">
            {#if error}
              <IconError size={'small'} fill={'var(--theme-error-color)'} />
            {:else if file.progress.uploadComplete}
              <IconCompleted size={'small'} fill="#38833F" />
            {:else}
              <ProgressCircle value={percentage} size={'small'} primary />
            {/if}
          </div>

          <div class="upload-file-row__content flex-col flex-gap-1">
            <div class="label overflow-label" use:tooltip={{ label: getEmbeddedLabel(file.name) }}>{file.name}</div>
            <div class="flex-row-center flex-gap-2 text-sm">
              {#if error}
                <Label label={uploader.status.Error} />
                <span class="label overflow-label" use:tooltip={{ label: getEmbeddedLabel(error) }}>{error}</span>
              {:else if file.progress.uploadStarted != null}
                {#if file.progress.uploadComplete}
                  <Label label={uploader.status.Completed} />
                  {#if file.progress.bytesTotal}
                    <span>{filesize(file.progress.bytesTotal)}</span>
                  {/if}
                {:else}
                  <Label label={uploader.status.Uploading} />
                  {#if file.progress.bytesTotal}
                    <span>{filesize(file.progress.bytesUploaded)} / {filesize(file.progress.bytesTotal)}</span>
                  {:else}
                    <span>{filesize(file.progress.bytesUploaded)}}</span>
                  {/if}
                {/if}
              {:else}
                <Label label={uploader.status.Waiting} />
                {#if file.progress.bytesTotal}
                  <span>{filesize(file.progress.bytesTotal)}</span>
                {/if}
              {/if}
            </div>
          </div>

          <div class="upload-file-row__tools flex-row-center">
            {#if error}
              <Button
                kind={'icon'}
                icon={IconRetry}
                iconProps={{ size: 'small' }}
                showTooltip={{ label: uploader.string.Retry }}
                on:click={() => {
                  handleRetryFile(file)
                }}
              />
            {/if}
            {#if !file.progress.uploadComplete && individualCancellation}
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
      padding-bottom: 1rem;
    }
  }

  .upload-file-row {
    .upload-file-row__content {
      flex-grow: 2;
    }

    .upload-file-row__tools {
      flex-shrink: 0;
    }
  }
</style>
