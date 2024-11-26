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
  import { Button, IconDelete, IconEdit, resizeObserver } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { drawing, type DrawingData, type DrawingTool } from '../drawing'
  import IconEraser from './icons/Eraser.svelte'

  export let active = false
  export let readonly = true
  export let imageWidth: number | undefined
  export let imageHeight: number | undefined
  export let drawings: DrawingData[]
  export let createDrawing: (data: any) => Promise<void>

  let drawingTool: DrawingTool = 'pen'
  let penColor = 'blue'
  const penColors = ['red', 'green', 'blue', 'white', 'black']
  let drawingData: DrawingData | undefined
  let board: HTMLDivElement
  let toolbar: HTMLDivElement
  let toolbarInside = false
  let oldReadonly: boolean
  let oldDrawings: DrawingData[]
  let modified = false

  $: updateToolbarPosition(readonly, board, toolbar)
  $: updateEditableState(drawings, readonly)

  function updateToolbarPosition (readonly: boolean, board: HTMLDivElement, toolbar: HTMLDivElement): void {
    if (!readonly && board?.offsetTop !== undefined && toolbar?.clientHeight !== undefined) {
      // TODO: There should be a generic solution
      // this only estimates a free room above the picture in FilePreviewPopup
      toolbarInside = board.offsetTop <= toolbar.clientHeight * 3
    }
  }

  function updateEditableState (drawings: DrawingData[], readonly: boolean): void {
    if (readonly !== oldReadonly || drawings !== oldDrawings) {
      if (drawings !== undefined) {
        if (readonly) {
          if (modified && drawingData !== undefined) {
            createDrawing(drawingData).catch((error) => {
              console.error('Failed to save drawing', error)
            })
          }
          drawingData = drawings[0]
          modified = false
        } else {
          if (drawingData === undefined) {
            drawingData = {}
          } else {
            // Edit current content as a new drawing
            drawingData = {
              content: drawingData.content
            }
          }
          modified = false
        }
      } else {
        drawingData = undefined
      }
      oldDrawings = drawings
      oldReadonly = readonly
    }
  }

  onDestroy(() => {
    if (modified && drawingData !== undefined) {
      createDrawing(drawingData).catch((error) => {
        console.error('Failed to save drawing', error)
      })
    }
  })
</script>

{#if active && drawingData !== undefined}
  <div
    {...$$restProps}
    style:position="relative"
    bind:this={board}
    use:resizeObserver={() => {
      updateToolbarPosition(readonly, board, toolbar)
    }}
    use:drawing={{
      readonly,
      imageWidth,
      imageHeight,
      drawingData,
      drawingTool,
      penColor,
      changed: (content) => {
        modified = true
        if (drawingData !== undefined) {
          drawingData.content = content
        }
      }
    }}
  >
    {#if !readonly}
      <div class="toolbar" class:inside={toolbarInside} bind:this={toolbar}>
        <Button
          icon={IconDelete}
          kind="icon"
          on:click={() => {
            drawingData = {}
            modified = true
          }}
        />
        <div class="divider buttons-divider" />
        <Button
          icon={IconEdit}
          kind="icon"
          selected={drawingTool === 'pen'}
          on:click={() => {
            drawingTool = 'pen'
          }}
        />
        <Button
          icon={IconEraser}
          kind="icon"
          selected={drawingTool === 'erase'}
          on:click={() => {
            drawingTool = 'erase'
          }}
        />
        <div class="divider buttons-divider" />
        {#each penColors as color}
          <Button
            kind="icon"
            selected={penColor === color}
            on:click={() => {
              penColor = color
            }}
          >
            <div
              slot="content"
              class="colorIcon"
              class:emphasized={color === 'white' || color === 'black'}
              style:background={color}
            />
          </Button>
        {/each}
      </div>
    {/if}
    <slot />
  </div>
{:else}
  <slot />
{/if}

<style lang="scss">
  .toolbar {
    position: absolute;
    display: inline-flex;
    align-items: center;
    padding: 5px;
    bottom: 100%;

    &.inside {
      left: 5px;
      top: 5px;
      bottom: unset;
      background-color: var(--theme-navpanel-color);
      border-radius: var(--small-BorderRadius);
      z-index: 1;
    }
  }

  .colorIcon {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin: -3px;

    &.emphasized {
      box-shadow: 0px 0px 3px 0px var(--theme-button-contrast-enabled);
    }
  }

  .divider {
    margin: 0 5px;
  }
</style>
