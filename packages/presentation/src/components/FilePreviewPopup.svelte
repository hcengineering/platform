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
  import { Analytics } from '@hcengineering/analytics'
  import { BlobMetadata, SortingOrder, type Blob, type Ref } from '@hcengineering/core'
  import { getEmbeddedLabel } from '@hcengineering/platform'
  import { Button, Dialog, IconHistory, IconScribble, showPopup, tooltip } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'

  import ActionContext from './ActionContext.svelte'
  import FilePreview from './FilePreview.svelte'
  import DownloadFileButton from './DownloadFileButton.svelte'
  import ObjectPopup from './ObjectPopup.svelte'
  import { ComponentExtensions } from '../index'
  import presentation from '../plugin'
  import FileTypeIcon from './FileTypeIcon.svelte'

  export let file: Ref<Blob> | undefined
  export let name: string
  export let contentType: string
  export let metadata: BlobMetadata | undefined
  export let props: Record<string, any> & {
    drawings?: any[]
    drawingAvailable?: boolean
    drawingEditable?: boolean
    loadDrawings?: () => Promise<any>
    createDrawing?: (data: any) => Promise<any>
  } = {}

  export let fullSize = false
  export let showIcon = true

  let drawingLoading = false
  let createDrawing: (data: any) => Promise<any>

  const dispatch = createEventDispatcher()

  onMount(() => {
    if (fullSize) {
      dispatch('fullsize')
    }
    if (props.drawingAvailable === true) {
      if (props.loadDrawings !== undefined) {
        drawingLoading = true
        props
          .loadDrawings()
          .then((result) => {
            drawingLoading = false
            props.drawings = result
          })
          .catch((error) => {
            drawingLoading = false
            Analytics.handleError(error)
            console.error('Failed to load drawings for file', file, error)
          })
      }
      if (props.createDrawing !== undefined) {
        createDrawing = props.createDrawing
        props.createDrawing = async (data: any): Promise<any> => {
          const newDrawing = await createDrawing(data)
          if (props.drawings !== undefined) {
            props.drawings = [newDrawing, ...props.drawings]
          } else {
            props.drawings = [newDrawing]
          }
          return newDrawing
        }
      }
    }
  })

  function toggleDrawingEdit (): void {
    props.drawingEditable = !(props.drawingEditable === true)
  }

  function selectCurrentDrawing (ev: MouseEvent): void {
    if (props.drawings === undefined || props.drawings.length === 0) {
      // no current means no history
      return
    }
    showPopup(
      ObjectPopup,
      {
        _class: props.drawings[0]._class,
        selected: props.drawings[0]._id,
        docQuery: {
          parent: props.drawings[0].parent
        },
        options: {
          sort: {
            createdOn: SortingOrder.Descending
          }
        },
        searchMode: 'disabled',
        type: 'presenter',
        width: 'auto'
      },
      ev.target as HTMLElement,
      async (result) => {
        if (result !== undefined) {
          props.drawings = [result]
        }
      }
    )
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
      {#if props.drawings !== undefined && props.drawings.length > 0}
        <Button
          icon={IconHistory}
          kind="icon"
          disabled={drawingLoading || props.drawingEditable === true}
          showTooltip={{ label: presentation.string.DrawingHistory }}
          on:click={selectCurrentDrawing}
        />
      {/if}
      <Button
        icon={IconScribble}
        kind="icon"
        disabled={drawingLoading}
        selected={props.drawingEditable === true}
        showTooltip={{ label: presentation.string.StartDrawing }}
        on:click={toggleDrawingEdit}
      />
      <div class="buttons-divider" />
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
