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
  import { Plugin, PluginKey } from '@tiptap/pm/state'
  import { DecorationSet } from '@tiptap/pm/view'
  import { onDestroy, onMount } from 'svelte'
  import { Markup } from '@hcengineering/core'

  import { calculateDecorations, createMarkupDocument } from './diff/decorations'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { defaultExtensions } from './extensions'

  export let content: Markup
  export let comparedVersion: Markup | undefined = undefined

  let element: HTMLElement
  let editor: Editor

  let _decoration = DecorationSet.empty
  let oldContent = ''

  function updateEditor (editor: Editor, comparedVersion?: Markup): void {
    if (!comparedVersion) {
      return
    }

    const r = calculateDecorations(editor, oldContent, createMarkupDocument(editor.schema, comparedVersion))
    if (r !== undefined) {
      oldContent = r.oldContent
      _decoration = r.decorations
    }
  }

  const updateDecorations = () => {
    if (editor?.schema) {
      updateEditor(editor, comparedVersion)
    }
  }

  const DecorationExtension = Extension.create({
    addProseMirrorPlugins () {
      return [
        new Plugin({
          key: new PluginKey('diffs'),
          props: {
            decorations () {
              updateDecorations()
              return _decoration
            }
          }
        })
      ]
    }
  })

  $: if (editor && comparedVersion) {
    updateEditor(editor, comparedVersion)
  }

  onMount(() => {
    editor = new Editor({
      editorProps: { attributes: mergeAttributes(defaultEditorAttributes, { class: 'flex-grow' }) },
      element,
      content,
      editable: false,
      extensions: [...defaultExtensions, DecorationExtension],
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor
      }
    })
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
    }
  })
</script>

<div class="ref-container">
  <div class="textInput">
    <div class="select-text" style="width: 100%;" bind:this={element} />
  </div>
</div>
