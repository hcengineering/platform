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
  import { resizeObserver } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import { drawing, type DrawingCmd, type DrawingData, type DrawingTool } from '../drawing'
  import DrawingBoardToolbar from './DrawingBoardToolbar.svelte'

  export let active = false
  export let readonly = true
  export let imageWidth: number | undefined
  export let imageHeight: number | undefined
  export let drawings: DrawingData[]
  export let createDrawing: (data: any) => Promise<void>

  let tool: DrawingTool = 'pen'
  let penColor = 'blue'
  let commands: DrawingCmd[] | undefined
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
          saveDrawing()
          parseDrawing(drawings[0])
          modified = false
        } else {
          if (commands === undefined) {
            commands = []
          } else {
            // Edit current content as a new drawing
            commands = [...commands]
          }
          modified = false
        }
      } else {
        commands = undefined
      }
      oldDrawings = drawings
      oldReadonly = readonly
    }
  }

  function parseDrawing (data: DrawingData | undefined): void {
    if (data?.content !== undefined && data?.content !== null) {
      try {
        commands = JSON.parse(data.content)
      } catch (error) {
        commands = []
        console.error('Failed to parse drawing content', error)
      }
    } else {
      commands = []
    }
  }

  function saveDrawing (): void {
    if (modified && commands !== undefined) {
      const data: DrawingData = {
        content: JSON.stringify(commands)
      }
      createDrawing(data).catch((error) => {
        console.error('Failed to save drawing', error)
      })
    }
  }

  onDestroy(() => {
    saveDrawing()
  })
</script>

{#if active && commands !== undefined}
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
      commands,
      tool,
      penColor,
      cmdAdded: () => {
        modified = true
      }
    }}
  >
    {#if !readonly}
      <DrawingBoardToolbar
        placeInside={toolbarInside}
        bind:toolbar
        bind:tool
        bind:penColor
        on:clear={() => {
          commands = []
          modified = true
        }}
      />
    {/if}
    <slot />
  </div>
{:else}
  <slot />
{/if}
