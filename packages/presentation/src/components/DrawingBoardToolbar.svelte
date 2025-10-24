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
  import {
    Button,
    IconAdd,
    IconDelete,
    IconEdit,
    IconMoreH,
    IconRedo,
    IconUndo,
    SelectPopup,
    SelectPopupValueType,
    eventToHTMLElement,
    showPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import IconEraser from './icons/Eraser.svelte'
  import IconMove from './icons/Move.svelte'
  import IconText from './icons/Text.svelte'
  import IconRectangle from './icons/Rectangle.svelte'
  import IconEllipse from './icons/Ellipse.svelte'
  import { DrawingTool } from '../drawing'
  import presentation from '../plugin'
  import { ColorMetaName, ColorMetaNameOrHex } from '../drawingUtils'
  import DrawingBoardToolbarColorIcon from './DrawingBoardToolbarColorIcon.svelte'
  import DrawingBoardColorSelectorIcon from './DrawingBoardColorSelectorIcon.svelte'
  import { ColorsList, DrawingBoardColoringSetup } from '../drawingColors'
  import { Analytics } from '@hcengineering/analytics'

  class ToolPresentation {
    constructor (readonly label: IntlString, readonly icon: IconEdit, readonly tool: DrawingTool) {
    }
  }

  const tools: ToolPresentation[] = [
    new ToolPresentation(presentation.string.PenTool, IconEdit, 'pen'),
    new ToolPresentation(presentation.string.EraserTool, IconEraser, 'erase'),
    new ToolPresentation(presentation.string.PanTool, IconMove, 'pan'),
    new ToolPresentation(presentation.string.TextTool, IconText, 'text'),
    new ToolPresentation(presentation.string.RectangleTool, IconRectangle, 'shape-rectangle'),
    new ToolPresentation(presentation.string.EllipseTool, IconEllipse, 'shape-ellipse')
  ]

  interface DrawingBoardToolbarEvents {
    undo: undefined
    redo: undefined
    clear: undefined
  }

  const dispatch = createEventDispatcher<DrawingBoardToolbarEvents>()

  const maxColors = 8
  const minColors = 0
  const defaultColor: ColorMetaName = 'alpha'
  const defaultColors: Array<ColorMetaName> = ['alpha', 'gamma', 'delta', 'epsilon']
  const storageKey = {
    color: 'drawingBoard.color',
    colors: 'drawingBoard.colors',
    penWidth: 'drawingBoard.penWidth',
    eraserWidth: 'drawingBoard.eraserWidth',
    fontSize: 'drawingBoard.fontSize'
  }

  export let tool: DrawingTool = 'pen'

  function evaluateToolPresentation (tool: DrawingTool): ToolPresentation {
    const found = tools.find(t => t.tool === tool)
    if (found == null) {
      return tools[0]
    }
    return found
  }

  let toolPresentation: ToolPresentation = evaluateToolPresentation(tool)

  $: {
    toolPresentation = evaluateToolPresentation(tool)
  }

  export let penColor: ColorMetaNameOrHex
  export let penWidth: number
  export let eraserWidth: number
  export let fontSize: number
  export let placeInside = false
  export let showPanTool = false
  export let toolbar: HTMLDivElement | undefined
  export let cmdEditor: HTMLDivElement | undefined
  export let disableUndo: boolean = false
  export let disableRedo: boolean = false
  export let colorsList: ColorsList

  const availableColors = new DrawingBoardColoringSetup(colorsList)
  let userSelectedPalette: ColorMetaNameOrHex[] = defaultColors

  type PaletteCommandId = 'add-color' | 'remove-color' | 'reset-colors'

  function showPaletteManagementMenu (ev: MouseEvent): void {
    const items: Array<Omit<SelectPopupValueType, 'id'> & { id: PaletteCommandId }> = []
    if (userSelectedPalette.length < maxColors) {
      items.push({
        id: 'add-color',
        label: presentation.string.ColorAdd,
        icon: IconAdd
      })
    }
    if (userSelectedPalette.length > minColors) {
      items.push({
        id: 'remove-color',
        label: presentation.string.ColorRemove,
        icon: IconDelete
      })
    }
    items.push({
      id: 'reset-colors',
      label: presentation.string.ColorReset,
      icon: IconRedo
    })

    showPopup(SelectPopup, { value: items }, eventToHTMLElement(ev), (id: PaletteCommandId | undefined) => {
      switch (id) {
        case 'add-color': {
          const colorsRange: Array<SelectPopupValueType> = colorsList.map((color, index) => ({
            id: index,
            icon: DrawingBoardColorSelectorIcon,
            iconProps: { color: color[0], palette: availableColors }
          }))
          showPopup(SelectPopup, { value: colorsRange }, eventToHTMLElement(ev), (id) => {
            if (id != null) {
              penColor = colorsList[id][0]
              addColorPreset()
            }
          })
          break
        }
        case 'remove-color': {
          userSelectedPalette = userSelectedPalette.filter((c: string) => c !== penColor)
          localStorage.setItem(storageKey.colors, JSON.stringify(userSelectedPalette))
          selectColor(userSelectedPalette[0])
          focusEditor()
          break
        }
        case 'reset-colors': {
          userSelectedPalette = defaultColors
          localStorage.removeItem(storageKey.colors)
          selectColor(userSelectedPalette[0])
          focusEditor()
          break
        }
        case undefined: {
          break
        }
        default: {
          Analytics.handleError(new Error(`Unknown command id '${id as any}'`))
        }
      }
    })
  }

  function addColorPreset (): void {
    if (!userSelectedPalette.includes(penColor)) {
      userSelectedPalette = [...userSelectedPalette, penColor]
      localStorage.setItem(storageKey.colors, JSON.stringify(userSelectedPalette))
    }
    focusEditor()
  }

  function selectColor (color: ColorMetaNameOrHex): void {
    penColor = color ?? defaultColor
    localStorage.setItem(storageKey.color, penColor)
  }

  function showToolSelectionMenu (ev: MouseEvent): void {
    const items: Array<Omit<SelectPopupValueType, 'id'> & { id: DrawingTool }> = []
    for (const toolPresentation of tools) {
      if (toolPresentation.tool === 'pan' && !showPanTool) {
        continue
      }
      items.push({
        id: toolPresentation.tool,
        label: toolPresentation.label,
        icon: toolPresentation.icon
      })
    }
    showPopup(SelectPopup, { value: items }, eventToHTMLElement(ev), (id: DrawingTool | undefined) => {
      if (id != null) {
        tool = id
      }
    })
  }

  onMount(() => {
    try {
      const savedColors = localStorage.getItem(storageKey.colors)
      userSelectedPalette = savedColors !== null ? JSON.parse(savedColors.toLowerCase()) : defaultColors
    } catch {
      userSelectedPalette = defaultColors
    }
    penColor = (localStorage.getItem(storageKey.color) ?? penColor ?? defaultColor) as ColorMetaNameOrHex
    if (!userSelectedPalette.includes(penColor)) {
      penColor = userSelectedPalette[0] ?? defaultColor
    }
    penWidth = parseInt(localStorage.getItem(storageKey.penWidth) ?? '4')
    eraserWidth = parseInt(localStorage.getItem(storageKey.eraserWidth) ?? '50')
    fontSize = parseInt(localStorage.getItem(storageKey.fontSize) ?? '20')
  })

  function updatePenWidth (): void {
    localStorage.setItem(storageKey.penWidth, penWidth.toString())
  }

  function updateEraserWidth (): void {
    localStorage.setItem(storageKey.eraserWidth, eraserWidth.toString())
  }

  function updateFontSize (): void {
    localStorage.setItem(storageKey.fontSize, fontSize.toString())
    focusEditor()
  }

  function focusEditor (): void {
    setTimeout(() => {
      if (cmdEditor !== undefined) {
        cmdEditor.focus()
      }
    }, 100)
  }
</script>

<div class="toolbar" class:inside={placeInside} bind:this={toolbar}>
  <Button
    icon={IconUndo}
    kind="icon"
    showTooltip={{ label: presentation.string.Undo }}
    noFocus
    disabled={disableUndo}
    on:click={() => {
      dispatch('undo')
    }}
  />
  <Button
    icon={IconRedo}
    kind="icon"
    showTooltip={{ label: presentation.string.Redo }}
    noFocus
    disabled={disableRedo}
    on:click={() => {
      dispatch('redo')
    }}
  />
  <Button
    icon={IconDelete}
    kind="icon"
    showTooltip={{ label: presentation.string.ClearCanvas }}
    noFocus
    on:click={() => {
      dispatch('clear')
    }}
  />
  <div class="divider buttons-divider" />
  <Button
    kind="icon"
    showTooltip={{ label: toolPresentation.label }}
    noFocus
    on:click={showToolSelectionMenu}
  >
    <div class="tool-button-with-indicator" slot="content">
      <svelte:component this={toolPresentation.icon} size="small" />
      <div class="tool-indicator" />
    </div>
  </Button>
  <div class="divider buttons-divider" />
  {#if tool === 'pen' || tool === 'shape-rectangle' }
    <input
      class="widthSelector"
      type="range"
      min={2}
      max={20}
      step={2}
      bind:value={penWidth}
      on:change={updatePenWidth}
    />
    <div class="divider buttons-divider" />
  {:else if tool === 'erase'}
    <input
      class="widthSelector"
      type="range"
      min={20}
      max={110}
      step={30}
      bind:value={eraserWidth}
      on:change={updateEraserWidth}
    />
    <div class="divider buttons-divider" />
  {:else if tool === 'text'}
    <input
      class="widthSelector"
      type="range"
      min={15}
      max={35}
      step={5}
      bind:value={fontSize}
      on:change={updateFontSize}
    />
    <div class="divider buttons-divider" />
  {/if}
  {#each userSelectedPalette as color}
    <Button
      kind="icon"
      noFocus
      selected={penColor === color}
      on:click={() => {
        if (tool === 'erase') {
          tool = 'pen'
        }
        selectColor(color)
        focusEditor()
      }}
    >
      <DrawingBoardToolbarColorIcon {color} palette={availableColors} slot="content" />
    </Button>
  {/each}
  <div>
    <Button
      kind="icon"
      icon={IconMoreH}
      noFocus
      showTooltip={{ label: presentation.string.PaletteManagementMenu }}
      on:click={showPaletteManagementMenu}
    />
  </div>
</div>

<style lang="scss">
  .toolbar {
    position: absolute;
    display: inline-flex;
    align-items: center;
    padding: 0.25rem;
    bottom: 100%;

    &.inside {
      left: 0.5rem;
      top: 0.5rem;
      bottom: unset;
      background-color: var(--theme-popup-header);
      border-radius: var(--small-BorderRadius);
      border: 1px solid var(--theme-popup-divider);
      box-shadow: 0.05rem 0.05rem 0.25rem rgba(0, 0, 0, 0.2);
      z-index: 10;
    }
  }

  .colorIcon {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 50%;
    margin: -0.15rem;
    box-shadow: 0px 0px 0.15rem 0px var(--theme-button-contrast-enabled);
  }

  .divider {
    margin: 0 0.25rem;
  }

  .widthSelector {
    width: 80px;
  }

  .tool-button-with-indicator {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tool-indicator {
    position: absolute;
    bottom: -0.125rem;
    right: -0.125rem;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 0 0 0.25rem 0.25rem;
    border-color: transparent transparent currentColor transparent;
    opacity: 0.7;
  }
</style>
