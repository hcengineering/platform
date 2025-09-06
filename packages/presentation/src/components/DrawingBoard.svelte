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
  import { onMount, onDestroy } from 'svelte'
  import { drawing, type DrawingData, type DrawingTool } from '../drawing'
  import DrawingBoardToolbar from './DrawingBoardToolbar.svelte'
  import { DrawingCommandsProcessor } from '../drawingCommandsProcessor'
  import { Doc as YDoc } from 'yjs'
  import { ColorMetaNameOrHex } from '../drawingUtils'
  import { themeStore } from '@hcengineering/theme'
  import { ColorsList, ThemeAwareColor } from '../drawingColors'
  import { DrawingCmd, CommandUid, DrawTextCmd } from '../drawingCommand'

  export let active = false
  export let readonly = true
  export let imageWidth: number | undefined
  export let imageHeight: number | undefined
  export let drawings: DrawingData[]
  export let createDrawing: (data: any) => Promise<void>

  let tool: DrawingTool
  let penColor: ColorMetaNameOrHex
  let penWidth: number
  let eraserWidth: number
  let fontSize: number
  let model: DrawingCmd[] | undefined
  let modified = false
  let board: HTMLDivElement
  let toolbar: HTMLDivElement
  let toolbarInside = false
  let currentReadonly: boolean
  let currentDrawings: DrawingData[]
  let changingCmdId: CommandUid | undefined
  let cmdEditor: HTMLDivElement | undefined
  let disableUndo: boolean = false
  let disableRedo: boolean = false

  const themeChangeUnsubscribe: Array<() => void> = []

  const DrawingColorPalette: ColorsList = [
    ['alpha', new ThemeAwareColor('#000', '#000')],
    ['beta', new ThemeAwareColor('#FFF', '#FFF')],
    ['gamma', new ThemeAwareColor('Fuchsia', 'Fuchsia')],
    ['delta', new ThemeAwareColor('Houseplant', 'Houseplant')],
    ['epsilon', new ThemeAwareColor('Sky', 'Sky')],
    ['zeta', new ThemeAwareColor('Turquoise', 'Turquoise')],
    ['eta', new ThemeAwareColor('Pink', 'Pink')],
    ['theta', new ThemeAwareColor('Cloud', 'Cloud')],
    ['iota', new ThemeAwareColor('#FFC114', '#FFC114')],
    ['kappa', new ThemeAwareColor('Mauve', 'Mauve')]
  ]

  const document: YDoc = new YDoc()
  const undoableCommands = document.getArray<DrawingCmd>('drawing-commands')
  const commandProcessor = new DrawingCommandsProcessor(document, undoableCommands)

  function onSavedCommandsChanged (): void {
    model = commandProcessor.snapshot()
    setTimeout(() => {
      const status = commandProcessor.getUndoRedoAvailability()
      disableUndo = currentReadonly || status.undoDisabled
      disableRedo = currentReadonly || status.redoDisabled
    })
  }

  $: updateToolbarPosition(readonly, board, toolbar)
  $: updateEditableState(drawings, readonly)

  function updateToolbarPosition (readonly: boolean, board: HTMLDivElement, toolbar: HTMLDivElement): void {
    if (!readonly && board?.offsetTop !== undefined && toolbar?.clientHeight !== undefined) {
      // TODO: There should be a generic solution
      // this only estimates a free room above the picture in FilePreviewPopup
      toolbarInside = board.offsetTop <= toolbar.clientHeight * 3
    }
  }

  function dropTextEditor (): void {
    changingCmdId = undefined
    cmdEditor = undefined
  }

  function handleModification (): void {
    modified = true
    dropTextEditor()
  }

  function updateEditableState (drawings: DrawingData[], readonly: boolean): void {
    const readOnlyStatusChanged = readonly !== currentReadonly
    const drawingsChanged = drawings !== currentDrawings

    if (!readOnlyStatusChanged && !drawingsChanged) {
      return
    }

    if (drawings !== undefined) {
      if (readonly) {
        saveDrawing()
        parseDrawing(drawings[0])
        modified = false
      } else {
        if (model === undefined) {
          commandProcessor.set([])
          onSavedCommandsChanged()
        } else {
          commandProcessor.ensureAllCommandsWithUids()
        }
        modified = false
      }
    } else {
      model = undefined
    }
    dropTextEditor()
    currentDrawings = drawings
    currentReadonly = readonly
  }

  function parseDrawing (data: DrawingData | undefined): void {
    if (data?.content !== undefined && data?.content !== null) {
      try {
        const commands: DrawingCmd[] = JSON.parse(data.content)
        commandProcessor.set(commands)
      } catch (error: any) {
        commandProcessor.set([])
        Analytics.handleError(error)
        console.error('Failed to parse drawing content', error)
      }
    } else {
      commandProcessor.set([])
    }
    onSavedCommandsChanged()
  }

  function saveDrawing (): void {
    if (modified && model !== undefined) {
      const data: DrawingData = {
        content: JSON.stringify(model)
      }
      createDrawing(data).catch((error) => {
        Analytics.handleError(error)
        console.error('Failed to save drawing', error)
      })
    }
  }

  function addCommand (command: DrawingCmd): void {
    if (model !== undefined) {
      commandProcessor.addCommand(command)
      handleModification()
    }
  }

  function showCommandProps (id: CommandUid): void {
    changingCmdId = id
    for (const command of model ?? []) {
      if (command.id === id) {
        if (command.type === 'text') {
          const textCommand = command as DrawTextCmd
          penColor = textCommand.color
          fontSize = textCommand.fontSize
        }
        break
      }
    }
  }

  function changeCommand (cmd: DrawingCmd): void {
    if (model !== undefined) {
      commandProcessor.changeCommand(cmd)
      handleModification()
    }
  }

  function deleteCommand (id: CommandUid): void {
    if (model !== undefined) {
      commandProcessor.deleteCommand(id)
      handleModification()
    }
  }

  onMount(() => {
    onSavedCommandsChanged()
    undoableCommands.observe(onSavedCommandsChanged)
  })

  onDestroy(() => {
    themeChangeUnsubscribe.forEach((unsubscribe) => {
      unsubscribe()
    })
    themeChangeUnsubscribe.length = 0

    undoableCommands.unobserve(onSavedCommandsChanged)

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
      colorsList: DrawingColorPalette,
      getCurrentTheme: () => $themeStore.variant,
      subscribeOnThemeChange: (callback) => {
        themeChangeUnsubscribe.push(themeStore.subscribe(callback))
      },
      readonly,
      imageWidth,
      imageHeight,
      commands: model,
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
        colorsList={DrawingColorPalette}
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
          commandProcessor.clear()
          modified = true
        }}
        on:undo={() => {
          commandProcessor.undo()
          modified = true
        }}
        on:redo={() => {
          commandProcessor.redo()
          modified = true
        }}
      />
    {/if}
    <slot />
  </div>
{:else}
  <slot />
{/if}
