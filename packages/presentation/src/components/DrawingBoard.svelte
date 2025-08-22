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
    CommandUid,
    DrawingCommands,
    drawing,
    makeCommandUid,
    type DrawingCmd,
    type DrawingData,
    type DrawingTool,
    type DrawTextCmd
  } from '../drawing'
  import DrawingBoardToolbar from './DrawingBoardToolbar.svelte'
  import { CommandsBufferAdapter, DrawingCommandsProcessor } from '../drawingCommandsProcessor'

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
  let model: DrawingCommands | undefined
  let board: HTMLDivElement
  let toolbar: HTMLDivElement
  let toolbarInside = false
  let oldReadonly: boolean
  let oldDrawings: DrawingData[]
  let changingCmdId: CommandUid | undefined
  let cmdEditor: HTMLDivElement | undefined
  let disableUndo: boolean = false
  let disableRedo: boolean = false

  function makeCommands (commands: DrawingCmd[]): DrawingCommands {
    return { commands, lastExecutedCommand: commands.length > 0 ? commands.length - 1 : undefined }
  }

  function makeCommandsAdapter (): CommandsBufferAdapter {
    return {
      addCommand: function (command: DrawingCmd): void {
        if (model === undefined) {
          model = makeCommands([command])
        } else {
          model = { ...model, commands: [...model.commands, command] }
        }
      },
      removeCommands: function (fromInclusive: number): void {
        if (model !== undefined) {
          model = { ...model, commands: model.commands.slice(0, fromInclusive) }
        }
      },
      changeCommand: function (command: DrawingCmd): void {
        if (model !== undefined) {
          model = { ...model, commands: model.commands.map((c) => (c.id === command.id ? command : c)) }
        }
      },
      deleteCommand: function (id: CommandUid): number | undefined {
        if (model === undefined) {
          return undefined
        }
        const index = model.commands.findIndex((c) => c.id === id)
        if (index >= 0) {
          model = { ...model, commands: model.commands.filter((c) => c.id !== id) }
          return index
        }
      },
      getCommandCount: function (): number {
        return model?.commands.length ?? 0
      },
      setLastExecutedCommandPointer: function (index: number | undefined): void {
        if (undefined !== model) {
          model = { ...model, lastExecutedCommand: index }
        }
      },
      getLastExecutedCommandsPointer: function (): number | undefined {
        return model?.lastExecutedCommand
      }
    }
  }

  function evaluateCanUndoRedo (processor: DrawingCommandsProcessor): void {
    disableUndo = !processor.canUndo()
    disableRedo = !processor.canRedo()
  }

  const processor = new DrawingCommandsProcessor(makeCommandsAdapter(), () => {
    evaluateCanUndoRedo(processor)
  })

  evaluateCanUndoRedo(processor)

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
          processor.modificationConsumed()
        } else {
          if (model === undefined) {
            model = makeCommands([])
            evaluateCanUndoRedo(processor)
          } else {
            // edit current content as a new drawing
            model = { ...model, commands: model.commands.map((cmd) => ({ ...cmd, id: cmd.id ?? makeCommandUid() })) }
          }
          processor.modificationConsumed()
        }
      } else {
        model = undefined
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
        const commands: DrawingCmd[] = JSON.parse(data.content)
        model = makeCommands(commands)
      } catch (error: any) {
        model = makeCommands([])
        Analytics.handleError(error)
        console.error('Failed to parse drawing content', error)
      }
    } else {
      model = makeCommands([])
    }
    evaluateCanUndoRedo(processor)
  }

  function saveDrawing (): void {
    if (processor.isModified() && model !== undefined) {
      const lastIdx = model.lastExecutedCommand ?? (model.commands.length - 1)
      const data: DrawingData = {
        content: JSON.stringify(model.commands.slice(0, lastIdx + 1))
      }
      createDrawing(data).catch((error) => {
        Analytics.handleError(error)
        console.error('Failed to save drawing', error)
      })
    }
  }

  function addCommand (command: DrawingCmd): void {
    if (model !== undefined) {
      processor.new(command)
      changingCmdId = undefined
      cmdEditor = undefined
    }
  }

  function showCommandProps (id: CommandUid): void {
    changingCmdId = id
    for (const command of model?.commands ?? []) {
      if (command.id === id) {
        if (command.type === 'text') {
          const textCmd = command as DrawTextCmd
          penColor = textCmd.color
          fontSize = textCmd.fontSize
        }
        break
      }
    }
  }

  function changeCommand (cmd: DrawingCmd): void {
    if (model !== undefined) {
      processor.change(cmd)
      changingCmdId = undefined
      cmdEditor = undefined
    }
  }

  function deleteCommand (id: CommandUid): void {
    if (model !== undefined) {
      processor.delete(id)
      changingCmdId = undefined
      cmdEditor = undefined
    }
  }

  onDestroy(() => {
    saveDrawing()
  })
</script>

{#if active && model !== undefined}
  <div
    {...$$restProps}
    style:position="relative"
    bind:this={board}
    use:resizeObserver={() => {
      updateToolbarPosition(readonly, board, toolbar)
    }}
    use:drawing={{
      autoSize: imageWidth === undefined || imageHeight === undefined,
      readonly,
      imageWidth,
      imageHeight,
      drawing: model,
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
        bind:disableUndo
        bind:disableRedo
        on:clear={() => {
          processor.clear()
        }}
        on:undo={() => {
          processor.undo()
        }}
        on:redo={() => {
          processor.redo()
        }}
      />
    {/if}
    <slot />
  </div>
{:else}
  <slot />
{/if}
