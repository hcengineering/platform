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
  import { resizeObserver } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import {
    drawing,
    makeCommandId,
    type DrawingCmd,
    type DrawingData,
    type DrawingTool,
    type DrawTextCmd
  } from '../drawing'
  import DrawingBoardToolbar from './DrawingBoardToolbar.svelte'

  export let active = false
  export let readonly = true
  export let imageWidth: number | undefined
  export let imageHeight: number | undefined
  export let drawings: DrawingData[]
  export let createDrawing: (data: any) => Promise<void>

  let tool: DrawingTool
  let penColor: string
  let penWidth: number
  let eraserWidth: number
  let fontSize: number
  let commands: DrawingCmd[] | undefined
  let board: HTMLDivElement
  let toolbar: HTMLDivElement
  let toolbarInside = false
  let oldReadonly: boolean
  let oldDrawings: DrawingData[]
  let modified = false
  let changingCmdId: string | undefined
  let cmdEditor: HTMLDivElement | undefined

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
            commands = commands.map((cmd) => ({ ...cmd, id: cmd.id ?? makeCommandId() }))
          }
          modified = false
        }
      } else {
        commands = undefined
      }
      changingCmdId = undefined
      cmdEditor = undefined
      oldDrawings = drawings
      oldReadonly = readonly
    }
  }

  function parseDrawing (data: DrawingData | undefined): void {
    if (data?.content !== undefined && data?.content !== null) {
      try {
        commands = JSON.parse(data.content)
      } catch (error: any) {
        commands = []
        Analytics.handleError(error)
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
        Analytics.handleError(error)
        console.error('Failed to save drawing', error)
      })
    }
  }

  function addCommand (cmd: DrawingCmd): void {
    if (commands !== undefined) {
      commands = [...commands, cmd]
      changingCmdId = undefined
      cmdEditor = undefined
      modified = true
    }
  }

  function showCommandProps (id: string): void {
    changingCmdId = id
    for (const cmd of commands ?? []) {
      if (cmd.id === id) {
        if (cmd.type === 'text') {
          const textCmd = cmd as DrawTextCmd
          penColor = textCmd.color
          fontSize = textCmd.fontSize
        }
        break
      }
    }
  }

  function changeCommand (cmd: DrawingCmd): void {
    if (commands !== undefined) {
      commands = commands.map((c) => (c.id === cmd.id ? cmd : c))
      changingCmdId = undefined
      cmdEditor = undefined
      modified = true
    }
  }

  function deleteCommand (id: string): void {
    if (commands !== undefined) {
      commands = commands.filter((c) => c.id !== id)
      changingCmdId = undefined
      cmdEditor = undefined
      modified = true
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
      penWidth,
      eraserWidth,
      fontSize,
      changingCmdId,
      cmdAdded: addCommand,
      cmdChanging: showCommandProps,
      cmdChanged: changeCommand,
      cmdUnchanged: () => {
        changingCmdId = undefined
      },
      cmdDeleted: deleteCommand,
      editorCreated: (editor) => {
        cmdEditor = editor
      }
    }}
  >
    {#if !readonly}
      <DrawingBoardToolbar
        placeInside={toolbarInside}
        {cmdEditor}
        bind:toolbar
        bind:tool
        bind:penColor
        bind:penWidth
        bind:eraserWidth
        bind:fontSize
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
