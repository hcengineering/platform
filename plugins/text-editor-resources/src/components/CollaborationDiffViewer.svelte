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
  import { Analytics } from '@hcengineering/analytics'
  import { MarkupNode } from '@hcengineering/text'
  import { onDestroy, onMount } from 'svelte'
  import { Doc as Ydoc, encodeStateAsUpdate, applyUpdate } from 'yjs'

  import { Editor, Extension, mergeAttributes } from '@tiptap/core'
  import { Plugin, PluginKey } from '@tiptap/pm/state'
  import { DecorationSet } from '@tiptap/pm/view'

  import { getEditorKit } from '../../src/kits/editor-kit'
  import { calculateDecorations, createYdocDocument } from './diff/decorations'
  import { defaultEditorAttributes } from './editor/editorProps'

  export let ydoc: Ydoc
  export let field: string | undefined = undefined
  export let comparedYdoc: Ydoc | undefined = undefined
  export let comparedField: string | undefined = undefined

  // export let mode: 'unified' = 'unified'

  let element: HTMLElement
  let editor: Editor

  let _decoration = DecorationSet.empty
  let oldContent: MarkupNode | undefined

  $: ydocCopy = copyYdoc(ydoc)

  function copyYdoc (ydoc: Ydoc): Ydoc {
    const copy = new Ydoc()
    const update = encodeStateAsUpdate(ydoc)
    applyUpdate(copy, update)
    return copy
  }

  function updateEditor (editor: Editor, ydoc: Ydoc, field?: string): void {
    const r = calculateDecorations(editor, oldContent, createYdocDocument(editor.schema, ydoc, field))
    if (r !== undefined) {
      oldContent = r.oldContent
      _decoration = r.decorations
    }
  }

  const updateDecorations = (): void => {
    if (editor?.schema !== undefined && comparedYdoc !== undefined) {
      updateEditor(editor, comparedYdoc, comparedField)
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

  $: if (editor !== undefined && comparedYdoc !== undefined) {
    updateEditor(editor, comparedYdoc, comparedField)
  }

  onMount(async () => {
    const kit = await getEditorKit({
      collaboration: {
        collaboration: { document: ydocCopy, field },
        collaborationCursor: false,
        inlineComments: false
      },
      qms: {
        qmsInlineComment: {
          isHighlightModeOn: () => false,
          getNodeHighlight: () => null
        }
      }
    })

    editor = new Editor({
      editorProps: { attributes: mergeAttributes(defaultEditorAttributes, { class: 'flex-grow' }) },
      element,
      editable: false,
      extensions: [kit, DecorationExtension],
      onContentError: ({ error, disableCollaboration }) => {
        disableCollaboration()
        Analytics.handleError(error)
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
