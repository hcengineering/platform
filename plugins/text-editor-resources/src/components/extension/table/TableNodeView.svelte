<!--
//
// Copyright © 2023, 2024 Hardcore Engineering Inc.
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
//
-->
<script lang="ts">
  import { IconAdd } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import { NodeViewContent, NodeViewProps, NodeViewWrapper } from '../../node-view'
  import { findTable, insertColumn, insertRow } from './utils'
  import { TableMap, updateColumnsOnResize } from '@tiptap/pm/tables'
  import TableToolbar from './TableToolbar.svelte'

  export let node: NodeViewProps['node']
  export let getPos: NodeViewProps['getPos']
  export let editor: NodeViewProps['editor']
  export let selected: NodeViewProps['selected']
  export let decorations: NodeViewProps['decorations']
  export let extension: NodeViewProps['extension']

  const className = extension.options.HTMLAttributes?.class ?? ''

  let editable = false
  $: editable = editor.isEditable

  editor.on('selectionUpdate', handleSelectionUpdate)

  let focused = false
  function handleSelectionUpdate (): void {
    const from = getPos()
    const to = from + node.nodeSize

    focused = editor.state.selection.from <= to && editor.state.selection.to >= from
  }

  function handleAddRow (evt: Event): void {
    evt.stopPropagation()
    evt.preventDefault()
    const table = findTable(editor.state.selection)
    if (table !== undefined) {
      const { height } = TableMap.get(table.node)
      const tr = insertRow(table, height, editor.state.tr)
      editor.view.dispatch(tr)
    }
  }

  function handleAddColumn (evt: Event): void {
    evt.stopPropagation()
    evt.preventDefault()
    const table = findTable(editor.state.selection)
    if (table !== undefined) {
      const { width } = TableMap.get(table.node)
      const tr = insertColumn(table, width, editor.state.tr)
      editor.view.dispatch(tr)
    }
  }

  function updateColumns (): void {
    updateColumnsOnResize(node, colgroupElement, tableElement, 25)
  }

  $: if (node && colgroupElement && tableElement) {
    updateColumns()
  }

  let tableElement: HTMLTableElement
  let colgroupElement: HTMLTableColElement

  onMount(() => {
    updateColumns()
  })

  onDestroy(() => {
    editor.off('selectionUpdate', handleSelectionUpdate)
  })
</script>

<NodeViewWrapper class="table-node-wrapper" data-drag-handle>
  <div class="table-wrapper" class:table-selected={editable && focused}>
    <div class="table-scroller">
      <table class={className} bind:this={tableElement}>
        <colgroup bind:this={colgroupElement} />
        <NodeViewContent as="tbody" />
      </table>
      <!-- this comment is necessary to remove the whitespace character that Svelte adds between elements, which causes various problems in prosemirror
    -->
    </div>
    <!--  https://github.com/sveltejs/svelte/issues/12765
    -->
    <div class="table-toolbar-components" contenteditable="false">
      {#if editable && focused}
        <div class="table-toolbar-container">
          <TableToolbar {editor} />
        </div>
        <!-- add col button -->
        <div class="table-button-container table-button-container__col flex">
          <div class="w-full h-full flex showOnHover">
            <button class="table-button w-full h-full" on:click={handleAddColumn}>
              <div class="table-button__dot" />
              <div class="table-button__icon"><IconAdd size={'small'} /></div>
            </button>
          </div>
        </div>
        <!-- add row button -->
        <div class="table-button-container table-button-container__row flex">
          <div class="w-full h-full flex showOnHover">
            <button class="table-button w-full h-full" on:click={handleAddRow}>
              <div class="table-button__dot" />
              <div class="table-button__icon"><IconAdd size={'small'} /></div>
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</NodeViewWrapper>

<style lang="scss">
  .table-wrapper {
    width: max-content;
    max-width: 100%;
    position: relative;

    .table-scroller {
      padding: 1.25rem 0;
      overflow-x: scroll;
      scrollbar-width: auto;
    }

    &::before {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
    }

    .table-button-container {
      position: absolute;
      transition: opacity 0.15s ease-in-out 0.15s;

      .table-button {
        border-radius: 2px;
        background-color: transparent;
        color: var(--theme-button-contrast-hovered);

        &:hover {
          background-color: var(--theme-button-hovered);
        }
      }

      .table-button__dot {
        width: 0.25rem;
        height: 0.25rem;
        border-radius: 50%;
        background-color: var(--text-editor-table-marker-color);
        display: none;
      }

      .table-button__icon {
        display: none;
      }

      &:hover {
        .table-button__dot {
          display: none;
        }
        .table-button__icon {
          display: block;
        }
      }

      &__col {
        right: -1.5rem;
        top: 0;
        bottom: 0;
        margin: 1.25rem 0;

        .table-button {
          width: 1.25rem;
        }
      }

      &__row {
        bottom: -0.25rem;
        left: 0;
        right: 0;

        .table-button {
          height: 1.25rem;
        }
      }
    }
  }

  .table-toolbar-container {
    position: absolute;
    top: -1.5rem;
    right: 0;
    z-index: 200;
  }
</style>
