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
  import { Document, RichDocumentContent } from '@hcengineering/document'
  import { getClient } from '@hcengineering/presentation'
  import { Editor } from '@tiptap/core'
  import Highlight from '@tiptap/extension-highlight'
  import Link from '@tiptap/extension-link'
  import Placeholder from '@tiptap/extension-placeholder'
  import TaskItem from '@tiptap/extension-task-item'
  import TaskList from '@tiptap/extension-task-list'
  import StarterKit from '@tiptap/starter-kit'
  import { Transaction } from 'prosemirror-state'
  import { Step } from 'prosemirror-transform'
  import { onDestroy, onMount } from 'svelte'
  import document from '../plugin'
  import { UniqId } from '../uniqId'

  export let object: Document

  export let revision: number

  export function canClose (): boolean {
    return true
  }

  const client = getClient()

  let richContent: RichDocumentContent[] = []

  function recreateDocument (version: number): void {
    const toApply = richContent.filter((it) => it.version <= version)
    // Filter steps if some next ones contain them in ignored.

    const asteps: Step[] = []
    for (const a of toApply) {
      asteps.push(...a.steps.map((it) => Step.fromJSON(editor.schema, it)))
    }

    const tr = editor.state.tr.delete(0, editor.state.doc.content.size)

    for (let i = 0; i < asteps.length; i++) {
      try {
        tr.step(asteps[i])
      } catch (err: any) {
        // debugger
        console.trace(err)
      }
    }
    if (tr.docChanged) {
      tr.setMeta('addToHistory', false)
      const newState = editor.state.apply(tr)
      editor.view.updateState(newState)
    }
  }

  async function update (revision: number): Promise<void> {
    richContent = await client.findAll(document.class.RichDocumentContent, { attachedTo: object._id })
    recreateDocument(revision)
  }

  $: update(revision)

  let editor: Editor

  onMount(() => {
    editor = new Editor({
      element,
      content: '',
      editable: false,
      extensions: [
        StarterKit,
        Highlight,
        Link.configure({ openOnClick: false }),
        // ...(supportSubmit ? [Handle] : []), // order important
        // Typography, // we need to disable 1/2 -> ½ rule (https://github.com/hcengineering/anticrm/issues/345)
        Placeholder.configure({ placeholder: '' }),
        TaskList,
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            class: 'flex flex-grow gap-1 checkbox_style'
          }
        }),
        UniqId
        // ...extensions
      ],
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor
      },
      onBlur: ({ event }) => {},
      onFocus: () => {},
      onUpdate: (op: { editor: Editor; transaction: Transaction }) => {},
      onSelectionUpdate: () => {}
    })
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
    }
  })

  let element: HTMLElement
</script>

<div class="select-text" style="width: 100%;" bind:this={element} />

<style lang="scss" global>
  .ProseMirror {
    overflow-y: auto;
    max-height: 60vh;
    outline: none;
    line-height: 150%;
    color: var(--accent-color);

    p:not(:last-child) {
      margin-block-end: 1em;
    }

    > * + * {
      margin-top: 0.75em;
    }

    /* Placeholder (at the top) */
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--dark-color);
      pointer-events: none;
      height: 0;
    }

    &::-webkit-scrollbar-thumb {
      background-color: var(--theme-bg-accent-hover);
    }
    &::-webkit-scrollbar-corner {
      background-color: var(--theme-bg-accent-hover);
    }
    &::-webkit-scrollbar-track {
      margin: 0;
    }
  }
</style>
