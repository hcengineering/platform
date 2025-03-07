<!--
// Copyright © 2024-2025 Hardcore Engineering Inc.
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
  import { Button, IconClose, Label, ProgressCircle, Scroller, tooltip } from '@hcengineering/ui'
  import { ObjectPresenter } from '@hcengineering/view-resources'
  import { createEventDispatcher, onMount } from 'svelte'

  import IconCompleted from './icons/Completed.svelte'
  import IconError from './icons/Error.svelte'
  import IconRetry from './icons/Retry.svelte'

  import uploader from '../plugin'
  import { uploads, type Upload, type FileUpload } from '../store'

  export let uploadId: string

  const dispatch = createEventDispatcher()
  let upload: Upload | undefined = undefined

  function updateState (state: Map<string, Upload>): void {
    upload = state.get(uploadId)
    if (upload === undefined) {
      dispatch('close')
      return
    }
    if (upload.progress === 100 && upload.error === undefined) {
      dispatch('close')
    }
    if (upload.files.size === 0) {
      dispatch('close')
    }
  }

  function handleCancelAll (): void {
    upload?.files.forEach((element) => {
        element.cancel?.()
    })
  }

  function handleCancelFile (file: FileUpload): void {
    file.cancel?.()
  }

  function handleRetryFile (file: FileUpload): void {
    void file.retry?.()
  }
  onMount(() => {
    return uploads.subscribe(updateState)
  })
</script>

<div class="antiPopup upload-popup">
  <div class="upload-popup__header flex-row-center flex-gap-1">
    <div class="label overflow-label">
      <Label label={uploader.string.UploadingTo} params={{ files: upload?.files.size }} />
    </div>
    <div class="flex flex-grow overflow-label">
      <ObjectPresenter
        objectId={upload?.target?.objectId}
        _class={upload?.target?.objectClass}
        shouldShowAvatar={false}
        accent
        noUnderline
      />
    </div>
    {#if upload?.error}
      <Button
        kind={'icon'}
        icon={IconClose}
        iconProps={{ size: 'small' }}
        showTooltip={{ label: uploader.string.Cancel }}
        on:click={() => {
          handleCancelAll()
        }}
      />
    {/if}
  </div>
  <Scroller>
    <div class="upload-popup__content flex-col flex-no-shrink flex-gap-4">
      {#if upload}
        {#each [...upload.files.values()] as file}
          {#if file.progress}
            <div class="upload-file-row flex-row-center justify-start flex-gap-4">
              <div class="upload-file-row__status w-4">
                {#if file.error}
                  <IconError size={'small'} fill={'var(--negative-button-default)'} />
                {:else if file.finished}
                  <IconCompleted size={'small'} fill={'var(--positive-button-default)'} />
                {:else}
                  <ProgressCircle value={file.progress} size={'small'} primary />
                {/if}
              </div>

              <div class="upload-file-row__content flex-col flex-gap-1">
                <div class="label overflow-label" use:tooltip={{ label: getEmbeddedLabel(file.name) }}>{file.name}</div>
                <div class="flex-row-center flex-gap-2 text-sm">
                  {#if file.error}
                    <Label label={uploader.status.Error} />
                    <span class="label overflow-label" use:tooltip={{ label: getEmbeddedLabel(file.error) }}
                      >{file.error}</span
                    >
                  {:else if file.progress > 0}
                    {#if file.finished}
                      <Label label={uploader.status.Completed} />
                    {:else}
                      <Label label={uploader.status.Uploading} />
                      <span>file.progress</span>
                    {/if}
                  {/if}
                </div>
              </div>

              <div class="upload-file-row__tools flex-row-center">
                {#if file.error}
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
                {#if !file.finished}
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
      {/if}
    </div>
  </Scroller>
</div>

<style lang="scss">
  .upload-popup {
    padding: var(--spacing-2);
    max-height: 30rem;

    .upload-popup__header {
      padding-bottom: 1rem;
      margin-left: 0.5rem;
      margin-right: 0.625rem;
    }

    .upload-popup__content {
      margin: 0.5rem;
      margin-right: 0.625rem;
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
