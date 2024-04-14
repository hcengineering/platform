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
  import { getMetadata } from '@hcengineering/platform'
  import presentation from '@hcengineering/presentation'
  import { MarkupNode, ReferenceNode, jsonToPmNode } from '@hcengineering/text'

  import { calculateDecorations } from './diff/decorations'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { ImageExtension } from './extension/imageExt'
  import { EditorKit } from '../kits/editor-kit'

  export let content: MarkupNode
  export let comparedVersion: MarkupNode | undefined = undefined

  let element: HTMLElement
  let editor: Editor

  let _decoration = DecorationSet.empty
  let oldContent: MarkupNode | undefined

  function updateEditor (editor: Editor, comparedVersion?: MarkupNode): void {
    if (comparedVersion === undefined) {
      return
    }

    const node = jsonToPmNode(comparedVersion, editor.schema)
    const r = calculateDecorations(editor, oldContent, node)
    if (r !== undefined) {
      oldContent = r.oldContent
      _decoration = r.decorations
    }
  }

  const updateDecorations = (): void => {
    if (editor?.schema !== undefined) {
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

  $: if (editor !== undefined && comparedVersion !== undefined) {
    updateEditor(editor, comparedVersion)
  }

  onMount(() => {
    editor = new Editor({
      editorProps: { attributes: mergeAttributes(defaultEditorAttributes, { class: 'flex-grow' }) },
      element,
      content,
      editable: false,
      extensions: [
        EditorKit,
        ReferenceNode,
        ImageExtension.configure({
          uploadUrl: getMetadata(presentation.metadata.UploadURL)
        }),
        DecorationExtension
      ],
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor
      }
    })
  })

  onDestroy(() => {
    if (editor !== undefined) {
      editor.destroy()
    }
  })
</script>

<div class="ref-container">
  <div class="textInput">
    <div class="select-text" style="width: 100%;" bind:this={element} />
  </div>
</div>
