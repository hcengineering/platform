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
  import { Editor, Extension, mergeAttributes } from '@tiptap/core'

  import { Plugin, PluginKey } from 'prosemirror-state'
  import { onDestroy, onMount } from 'svelte'

  import { Markup } from '@hcengineering/core'
  import { IconObjects, IconSize } from '@hcengineering/ui'
  import StyleButton from './StyleButton.svelte'

  import { DecorationSet } from 'prosemirror-view'
  import textEditorPlugin from '../plugin'

  import { calculateDecorations } from './diff/decorations'
  import { defaultExtensions } from './extensions'
  import { defaultEditorAttributes } from './editor/editorProps'

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
      editorProps: { attributes: mergeAttributes(defaultEditorAttributes, { class: 'flex-grow' }) },
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
