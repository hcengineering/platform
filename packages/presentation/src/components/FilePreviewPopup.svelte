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
  import { type Blob, type Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Button, Dialog, IconEdit, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  import { BlobMetadata } from '../types'

  import ActionContext from './ActionContext.svelte'
  import FilePreview from './FilePreview.svelte'
  import DownloadFileButton from './DownloadFileButton.svelte'
  import { ComponentExtensions } from '../index'
  import presentation from '../plugin'
  import FileTypeIcon from './FileTypeIcon.svelte'

  export let file: Ref<Blob> | undefined
  export let name: string
  export let contentType: string
  export let metadata: BlobMetadata | undefined
  export let props: Record<string, any> = {}

  export let fullSize = false
  export let showIcon = true

  let drawingLoading = false

  const dispatch = createEventDispatcher()

  onMount(() => {
    if (fullSize) {
      dispatch('fullsize')
    }
    if (props.drawingAvailable === true) {
      loadDrawings(props.loadDrawings)
    }
  })

  function toggleDrawingEdit (): void {
    const editable = props.drawingEditable === true
    props = { ...props, drawingEditable: !editable }
  }

  function loadDrawings (load: () => Promise<any>): void {
    if (load !== undefined) {
      drawingLoading = true
      load()
        .then((result) => {
          drawingLoading = false
          props.drawingData = result
        })
        .catch((error) => {
          drawingLoading = false
          console.error('Failed to load drawings for file', file, error)
        })
    }
  }
</script>

<ActionContext context={{ mode: 'browser' }} />
<Dialog
  isFullSize
  on:fullsize
  on:close={() => {
    dispatch('close')
  }}
>
  <svelte:fragment slot="title">
    <div class="antiTitle icon-wrapper">
      {#if showIcon}
        <div class="wrapped-icon">
          <FileTypeIcon {name} />
        </div>
      {/if}
      <span class="wrapped-title" use:tooltip={{ label: getEmbeddedLabel(name) }}>{name}</span>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="utils">
    {#if props.drawingAvailable === true}
      <Button
        icon={IconEdit}
        kind="icon"
        disabled={drawingLoading}
        showTooltip={{ label: presentation.string.StartDrawing }}
        on:click={toggleDrawingEdit}
      />
    {/if}
    <DownloadFileButton {name} {file} />
    <ComponentExtensions
      extension={presentation.extension.FilePreviewPopupActions}
      props={{
        file,
        name,
        contentType,
        metadata
      }}
    />
  </svelte:fragment>

  {#if file}
    <FilePreview {file} {contentType} {name} {metadata} {props} fit />
  {/if}
</Dialog>
