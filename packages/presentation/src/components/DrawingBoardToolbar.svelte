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

  interface DrawingBoardToolbarEvents {
    undo: undefined
    redo: undefined
    clear: undefined
  }

  import IconEraser from './icons/Eraser.svelte'
  import IconMove from './icons/Move.svelte'
  import IconText from './icons/Text.svelte'
  import { DrawingTool } from '../drawing'
  import presentation from '../plugin'

  const dispatch = createEventDispatcher<DrawingBoardToolbarEvents>()
  const maxColors = 8
  const minColors = 0
  const defaultColor = '#0000ff'
  const defaultColors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000']
  const storageKey = {
    color: 'drawingBoard.color',
    colors: 'drawingBoard.colors',
    penWidth: 'drawingBoard.penWidth',
    eraserWidth: 'drawingBoard.eraserWidth',
    fontSize: 'drawingBoard.fontSize'
  }

  export let tool: DrawingTool = 'pen'
  export let penColor: string
  export let penWidth: number
  export let eraserWidth: number
  export let fontSize: number
  export let placeInside = false
  export let showPanTool = false
  export let toolbar: HTMLDivElement | undefined
  export let cmdEditor: HTMLDivElement | undefined
  export let disableUndo: boolean = false
  export let disableRedo: boolean = false

  let colorSelector: HTMLInputElement
  let colorsPalette: string[] = defaultColors

  type PaletteCommandId = 'add-color' | 'remove-color' | 'reset-colors'

  function showPaletteManagementMenu (ev: MouseEvent): void {
    const items: Array<Omit<SelectPopupValueType, 'id'> & { id: PaletteCommandId }> = []
    if (colorsPalette.length < maxColors) {
      items.push({
        id: 'add-color',
        label: presentation.string.ColorAdd,
        icon: IconAdd
      })
    }
    if (colorsPalette.length > minColors) {
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
          if (colorSelector !== undefined) {
            colorSelector.value = penColor
            colorSelector.showPicker()
          }
          break
        }
        case 'remove-color': {
          colorsPalette = colorsPalette.filter((c: string) => c !== penColor)
          localStorage.setItem(storageKey.colors, JSON.stringify(colorsPalette))
          selectColor(colorsPalette[0])
          focusEditor()
          break
        }
        case 'reset-colors': {
          colorsPalette = defaultColors
          localStorage.removeItem(storageKey.colors)
          selectColor(colorsPalette[0])
          focusEditor()
          break
        }
        case undefined: {
          break
        }
        default: {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _exhaustive: never = id
          console.error('Unknown command id', id)
        }
      }
    })
  }

  function addColorPreset (): void {
    penColor = penColor.toLowerCase()
    if (!colorsPalette.includes(penColor)) {
      colorsPalette = [...colorsPalette, penColor]
      localStorage.setItem(storageKey.colors, JSON.stringify(colorsPalette))
    }
    focusEditor()
  }

  function selectColor (color: string): void {
    penColor = color ?? defaultColor
    localStorage.setItem(storageKey.color, penColor)
  }

  onMount(() => {
    try {
      const savedColors = localStorage.getItem(storageKey.colors)
      colorsPalette = savedColors !== null ? JSON.parse(savedColors.toLowerCase()) : defaultColors
    } catch {
      colorsPalette = defaultColors
    }
    penColor = (localStorage.getItem(storageKey.color) ?? penColor ?? defaultColor).toLowerCase()
    if (!colorsPalette.includes(penColor)) {
      penColor = colorsPalette[0] ?? defaultColor
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
  <div class="divider buttons-divider" />
  <Button
    icon={IconDelete}
    kind="icon"
    showTooltip={{ label: presentation.string.ClearCanvas }}
    noFocus
    on:click={() => {
      tool = 'pen'
      dispatch('clear')
    }}
  />
  <div class="divider buttons-divider" />
  <Button
    icon={IconEdit}
    kind="icon"
    showTooltip={{ label: presentation.string.PenTool }}
    noFocus
    selected={tool === 'pen'}
    on:click={() => {
      tool = 'pen'
    }}
  />
  <Button
    icon={IconEraser}
    kind="icon"
    showTooltip={{ label: presentation.string.EraserTool }}
    noFocus
    selected={tool === 'erase'}
    on:click={() => {
      tool = 'erase'
    }}
  />
  {#if showPanTool}
    <Button
      icon={IconMove}
      kind="icon"
      showTooltip={{ label: presentation.string.PanTool }}
      noFocus
      selected={tool === 'pan'}
      on:click={() => {
        tool = 'pan'
      }}
    />
  {/if}
  <Button
    icon={IconText}
    kind="icon"
    showTooltip={{ label: presentation.string.TextTool }}
    noFocus
    selected={tool === 'text'}
    on:click={() => {
      tool = 'text'
    }}
  />
  <div class="divider buttons-divider" />
  {#if tool === 'pen'}
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
  {#each colorsPalette as color}
    <Button
      kind="icon"
      noFocus
      selected={penColor === color}
      showTooltip={{ label: presentation.string.ColorTooltip, props: { color } }}
      on:click={() => {
        if (tool === 'erase') {
          tool = 'pen'
        }
        selectColor(color)
        focusEditor()
      }}
    >
      <div slot="content" class="colorIcon" style:background={color} />
    </Button>
  {/each}
  <div>
    <input
      type="color"
      class="colorSelector"
      bind:this={colorSelector}
      bind:value={penColor}
      on:change={addColorPreset}
    />
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

  .colorSelector {
    position: absolute;
    width: 0;
    opacity: 0;
  }

  .widthSelector {
    width: 80px;
  }
</style>
