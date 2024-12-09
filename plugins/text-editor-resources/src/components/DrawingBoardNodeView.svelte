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
  import { Button, IconScribble } from '@hcengineering/ui'
  import { Node } from '@tiptap/pm/model'
  import { Editor } from '@tiptap/core'
  import { onDestroy, onMount } from 'svelte'
  import { showBoardPopup, SavedBoard } from './extension/drawingBoard'
  import NodeViewWrapper from './node-view/NodeViewWrapper.svelte'
  import DrawingBoardEditor from './DrawingBoardEditor.svelte'

  export let getSavedBoard: (id: string) => SavedBoard
  export let node: Node
  export let editor: Editor
  export let selected: boolean
  export let getPos: any

  const defaultHeight = 500
  const maxHeight = 1000
  const minHeight = 100

  let savedBoard: SavedBoard
  let resizer: HTMLElement
  let startY: number
  let resizedHeight: number | undefined
  let loading = true
  let loadingTimer: any

  function onResizerPointerDown (e: PointerEvent): void {
    e.preventDefault()
    const height = node.attrs.height ?? defaultHeight
    startY = e.clientY - height
    resizedHeight = height
    resizer.setPointerCapture(e.pointerId)
    resizer.addEventListener('pointermove', onResizerPointerMove)
    resizer.addEventListener('pointerup', onResizerPointerUp)
  }

  function onResizerPointerMove (e: PointerEvent): void {
    e.preventDefault()
    resizedHeight = Math.max(minHeight, e.clientY - startY)
    resizedHeight = Math.min(maxHeight, resizedHeight)
  }

  function onResizerPointerUp (e: PointerEvent): void {
    e.preventDefault()
    resizer.releasePointerCapture(e.pointerId)
    resizer.removeEventListener('pointermove', onResizerPointerMove)
    resizer.removeEventListener('pointerup', onResizerPointerUp)
    if (typeof getPos === 'function') {
      const tr = editor.state.tr.setNodeMarkup(getPos(), undefined, { ...node.attrs, height: resizedHeight })
      editor.view.dispatch(tr)
    }
    resizedHeight = undefined
  }

  onMount(() => {
    let delay = 100
    const getBoard = (): void => {
      loadingTimer = undefined
      savedBoard = getSavedBoard(node.attrs.id)
      loading = savedBoard.loading
      if (loading) {
        loadingTimer = setTimeout(getBoard, delay)
        delay *= 1.5
      }
    }
    getBoard()
  })

  onDestroy(() => {
    if (loadingTimer !== undefined) {
      clearTimeout(loadingTimer)
    }
  })
</script>

{#if savedBoard?.commands !== undefined && savedBoard?.props !== undefined}
  <NodeViewWrapper data-drag-handle="" data-type="drawingBoard" data-id={node.attrs.id}>
    <DrawingBoardEditor
      savedCmds={savedBoard.commands}
      savedProps={savedBoard.props}
      resizeable={true}
      readonly={!selected}
      {loading}
      {selected}
      height={resizedHeight ?? node.attrs.height ?? defaultHeight}
    >
      <div class="openButtonContainer">
        <Button
          kind={selected ? 'primary' : 'ghost'}
          icon={IconScribble}
          disabled={loading}
          noFocus
          on:click={() => {
            showBoardPopup(savedBoard, editor)
          }}
        />
      </div>
      {#if selected}
        <div class="handle resizer" bind:this={resizer} on:pointerdown={onResizerPointerDown}>
          <svg viewBox="0 0 60 4" height="4" width="60" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path
              d="m60 2a2 2 0 0 1 -2 2 2 2 0 0 1 -2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-8 0a2 2 0 0 1 -2 2 2 2 0 0 1 -2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-8 0a2 2 0 0 1 -2 2 2 2 0 0 1 -2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-8 0a2 2 0 0 1 -2 2 2 2 0 0 1 -2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-8 0a2 2 0 0 1 -2 2 2 2 0 0 1 -2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-8 0a2 2 0 0 1 -2 2 2 2 0 0 1 -2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-8 0a2 2 0 0 1 -2 2 2 2 0 0 1 -2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2zm-8 0a2 2 0 0 1 -2 2 2 2 0 0 1 -2-2 2 2 0 0 1 2-2 2 2 0 0 1 2 2z"
            />
          </svg>
        </div>
        <div class="handle drag">
          <svg viewBox="0 0 4 28" height="28" width="4" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path
              d="m2 28c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm0-8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"
            />
          </svg>
        </div>
      {/if}
    </DrawingBoardEditor>
  </NodeViewWrapper>
{/if}

<style lang="scss">
  .openButtonContainer {
    z-index: 1;
    position: absolute;
    top: 0.3rem;
    right: 0.3rem;
  }

  .handle {
    z-index: 1;
    position: absolute;
    color: var(--global-on-accent-TextColor);
    background-color: var(--global-accent-IconColor);
    border: 1px solid var(--theme-editbox-focus-border);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }

  .resizer {
    bottom: 0;
    left: calc(50% - 4rem);
    width: 8rem;
    height: 0.6rem;
    cursor: row-resize;
    border-top-left-radius: var(--small-BorderRadius);
    border-top-right-radius: var(--small-BorderRadius);
    border-bottom: none;
  }

  .drag {
    left: -0.6rem;
    top: calc(50% - 2rem);
    width: 0.6rem;
    height: 4rem;
    cursor: move;
    border-top-left-radius: var(--small-BorderRadius);
    border-bottom-left-radius: var(--small-BorderRadius);
    border-right: none;
  }
</style>
