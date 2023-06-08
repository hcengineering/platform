<!--
//
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Editor, Extension } from '@tiptap/core'

  import { Plugin, PluginKey } from 'prosemirror-state'
  import { onDestroy, onMount } from 'svelte'

  import { Markup } from '@hcengineering/core'
  import { IconObjects, IconSize } from '@hcengineering/ui'
  import StyleButton from './StyleButton.svelte'

  import { DecorationSet } from 'prosemirror-view'
  import textEditorPlugin from '../plugin'

  import { calculateDecorations } from './diff/decorations'
  import { defaultExtensions } from './extensions'

  export let content: Markup
  export let buttonSize: IconSize = 'small'
  export let comparedVersion: Markup | undefined = undefined
  export let noButton: boolean = false
  export let readonly = false

  let element: HTMLElement
  let editor: Editor

  let _decoration = DecorationSet.empty
  let oldContent = ''

  function updateEditor (editor?: Editor, comparedVersion?: Markup | ArrayBuffer): void {
    const r = calculateDecorations(editor, oldContent, undefined, comparedVersion)
    if (r !== undefined) {
      oldContent = r.oldContent
      _decoration = r.decorations
    }
  }

  const updateDecorations = () => {
    if (editor && editor.schema) {
      updateEditor(editor, comparedVersion)
    }
  }

  const DecorationExtension = Extension.create({
    addProseMirrorPlugins () {
      return [
        new Plugin({
          key: new PluginKey('diffs'),
          props: {
            decorations (state) {
              updateDecorations()
              if (showDiff) {
                return _decoration
              }
              return undefined
            }
          }
        })
      ]
    }
  })

  $: updateEditor(editor, comparedVersion)

  onMount(() => {
    editor = new Editor({
      element,
      content,
      editable: true,
      extensions: [...defaultExtensions, DecorationExtension],
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor
      }
    })
    editor.setEditable(!readonly)
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
    }
  })
  let showDiff = true
</script>

<div class="ref-container">
  {#if comparedVersion !== undefined && !noButton}
    <div class="flex">
      <div class="flex-grow" />
      <div class="formatPanel buttons-group xsmall-gap mb-4">
        <StyleButton
          icon={IconObjects}
          size={buttonSize}
          selected={showDiff}
          showTooltip={{ label: textEditorPlugin.string.EnableDiffMode }}
          on:click={() => {
            showDiff = !showDiff
            editor.chain().focus()
          }}
        />
      </div>
    </div>
  {/if}
  <div class="textInput">
    <div class="select-text" style="width: 100%;" bind:this={element} />
  </div>
</div>

<style lang="scss" global>
  .ProseMirror {
    flex-grow: 1;
    overflow: auto;
    min-height: inherit !important;
    max-height: inherit !important;
    outline: none;
    line-height: 150%;
    color: var(--theme-caption-color);

    p:not(:last-child) {
      margin-block-end: 1em;
    }

    pre {
      white-space: pre !important;
    }

    > * + * {
      margin-top: 0.75em;
    }

    /* Placeholder (at the top) */
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--theme-halfcontent-color);
      pointer-events: none;
      height: 0;
    }
    &:focus-within p.is-editor-empty:first-child::before {
      color: var(--theme-trans-color);
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--scrollbar-bar-color);
    }
    &::-webkit-scrollbar-thumb:hover {
      background-color: var(--scrollbar-bar-hover);
    }
    &::-webkit-scrollbar-corner {
      background-color: var(--scrollbar-bar-color);
    }
    &::-webkit-scrollbar-track {
      margin: 0;
    }
  }

  .lint-icon {
    display: inline-block;
    position: absolute;
    right: 2px;
    cursor: pointer;
    border-radius: 100px;
    // background: #f22;
    color: white;
    font-family: times, georgia, serif;
    font-size: 15px;
    font-weight: bold;
    width: 0.7em;
    height: 0.7em;
    text-align: center;
    padding-left: 0.5px;
    line-height: 1.1em;
    &.add {
      background: lightblue;
    }
    &.delete {
      background: orange;
    }
  }

  /* Give a remote user a caret */
  .collaboration-cursor__caret {
    border-left: 1px solid #0d0d0d;
    border-right: 1px solid #0d0d0d;
    margin-left: -1px;
    margin-right: -1px;
    pointer-events: none;
    position: relative;
    word-break: normal;
  }

  /* Render the username above the caret */
  .collaboration-cursor__label {
    border-radius: 3px 3px 3px 0;
    color: #0d0d0d;
    font-size: 12px;
    font-style: normal;
    font-weight: 600;
    left: -1px;
    line-height: normal;
    padding: 0.1rem 0.3rem;
    position: absolute;
    top: -1.4em;
    user-select: none;
    white-space: nowrap;
  }

  cmark {
    border-top: 1px solid lightblue;
    border-bottom: 1px solid lightblue;
    border-radius: 2px;
  }

  span.insertion {
    border-top: 1px solid lightblue;
    border-bottom: 1px solid lightblue;
    border-radius: 2px;
  }
  span.deletion {
    text-decoration: line-through;
  }
</style>
