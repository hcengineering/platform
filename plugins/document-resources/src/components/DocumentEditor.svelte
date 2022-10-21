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
  import { generateId, Ref } from '@hcengineering/core'
  import { Document, RichDocumentContent } from '@hcengineering/document'
  import { IntlString, translate } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'

  import { Editor, HTMLContent } from '@tiptap/core'
  import Highlight from '@tiptap/extension-highlight'
  import Link from '@tiptap/extension-link'
  // import Typography from '@tiptap/extension-typography'
  import Placeholder from '@tiptap/extension-placeholder'
  // import Collab from '@tiptap/extension-collaboration'
  import TaskItem from '@tiptap/extension-task-item'
  import TaskList from '@tiptap/extension-task-list'
  import StarterKit from '@tiptap/starter-kit'
  import { Transaction } from 'prosemirror-state'
  import { Step, Transform } from 'prosemirror-transform'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'
  import document from '../plugin'
  import { UniqId } from '../uniqId'

  export let object: Document
  export let defaultTimeout = 1500

  const client = getClient()

  interface Rebaseable {
    step: Step
    inverted: Step
    origin: Transform
  }

  const contentQuery = createQuery()

  let richContent: RichDocumentContent[] = []
  let appliedSequence: number = 0

  let applyTimer: number | undefined = undefined

  // Uncommited steps.
  let steps: Rebaseable[] = []

  $: contentQuery.query(
    document.class.RichDocumentContent,
    { attachedTo: object._id, collection: 'content' },
    (res) => {
      richContent = res
    },
    { sort: { version: 1 } }
  )

  let content: string = ''
  export let placeholder: IntlString = document.string.EditorPlaceholder

  let element: HTMLElement
  let editor: Editor

  let placeHolderStr: string = ''

  const ownRichContent: Ref<RichDocumentContent>[] = [generateId()]

  $: ph = translate(placeholder, {}).then((r) => {
    placeHolderStr = r
  })

  const dispatch = createEventDispatcher()

  export function submit (): void {
    content = editor.getHTML()
    dispatch('content', content)
  }

  export function clear (): void {
    content = ''
    editor.commands.clearContent(false)
  }
  export function insertText (text: string): void {
    editor.commands.insertContent(text as HTMLContent)
  }

  export function toggleBold () {
    editor.commands.toggleBold()
  }
  export function toggleItalic () {
    editor.commands.toggleItalic()
  }
  export function toggleStrike () {
    editor.commands.toggleStrike()
  }
  export function getLink () {
    return editor.getAttributes('link').href
  }
  export function unsetLink () {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
  }
  export function setLink (link: string) {
    editor.chain().focus().extendMarkRange('link').setLink({ href: link }).run()
  }
  export function checkIsSelectionEmpty () {
    return editor.view.state.selection.empty
  }
  export function toggleOrderedList () {
    editor.commands.toggleOrderedList()
  }
  export function toggleBulletList () {
    editor.commands.toggleBulletList()
  }
  export function toggleBlockquote () {
    editor.commands.toggleBlockquote()
  }
  export function toggleCode () {
    editor.commands.toggleCode()
  }
  export function toggleCodeBlock () {
    editor.commands.toggleCodeBlock()
  }
  let needFocus = false

  let focused = false
  export function focus (): void {
    needFocus = true
  }

  $: if (editor && needFocus) {
    if (!focused) {
      editor.commands.focus()
    }
    needFocus = false
  }

  function unconfirmedFrom (transform: Transform): Rebaseable[] {
    const result = []
    for (let i = 0; i < transform.steps.length; i++) {
      result.push({
        step: transform.steps[i],
        inverted: transform.steps[i].invert(transform.docs[i]),
        origin: transform
      })
    }
    return result
  }

  function rebaseSteps (steps: readonly Rebaseable[], over: readonly Step[], transform: Transform): Rebaseable[] {
    for (let i = steps.length - 1; i >= 0; i--) transform.step(steps[i].inverted)
    for (let i = 0; i < over.length; i++) transform.step(over[i])
    const result = []
    for (let i = 0, mapFrom = steps.length; i < steps.length; i++) {
      const mapped = steps[i].step.map(transform.mapping.slice(mapFrom))
      mapFrom--
      if (mapped && !transform.maybeStep(mapped).failed) {
        ;(transform.mapping as any).setMirror(mapFrom, transform.steps.length - 1)
        result.push({
          step: mapped,
          inverted: mapped.invert(transform.docs[transform.docs.length - 1]),
          origin: steps[i].origin
        })
      }
    }
    return result
  }

  function applyEditorSteps (editor: Editor, currentSequence: number, richContent: RichDocumentContent[]): void {
    const maxVersion = richContent.reduce((a, b) => Math.max(a, b.version), 0)

    const toApply = richContent.filter((it) => it.version > currentSequence && !ownRichContent.includes(it._id))
    // Filter steps if some next ones contain them in ignored.

    const asteps: Step[] = []
    for (const a of toApply) {
      asteps.push(...a.steps.map((it) => Step.fromJSON(editor.schema, it)))
    }
    const tr = editor.state.tr

    if (steps.length > 0) {
      steps = rebaseSteps(steps, asteps, tr)
    } else {
      for (let i = 0; i < asteps.length; i++) {
        try {
          tr.step(asteps[i])
        } catch (err: any) {
          // debugger
          console.trace(err)
        }
      }
    }
    if (tr.docChanged) {
      tr.setMeta('addToHistory', false)
      const newState = editor.state.apply(tr)
      editor.view.updateState(newState)
      appliedSequence = maxVersion
      content = editor.getHTML()
    }
  }

  $: if (editor !== undefined) {
    // Apply all transactions to editor
    applyEditorSteps(editor, appliedSequence, richContent)
  }

  export async function applySteps (): Promise<void> {
    const seq = object.editSequence
    if (seq === appliedSequence) {
      const ops = client.apply(object._class + object._id).match<Document>(document.class.Document, {
        editSequence: object.editSequence
      })
      await ops.update(object, { editSequence: seq + 1 })
      const sendSteps = steps.length
      if (sendSteps === 0) {
        return
      }
      const toSend: Step[] = []
      let c: Step | null = null
      const rawSteps = steps.slice(0, sendSteps).map((it) => it.step)
      for (const s of rawSteps) {
        if (toSend.length === 0) {
          toSend.push(s)
        } else if ((c = toSend[toSend.length - 1].merge(s)) != null) {
          toSend[toSend.length - 1] = c
        } else {
          toSend.push(s)
        }
      }
      await ops.addCollection(
        document.class.RichDocumentContent,
        object.space,
        object._id,
        object._class,
        'content',
        {
          version: seq + 1,
          steps: toSend.map((it) => it.toJSON())
        },
        ownRichContent[ownRichContent.length - 1]
      )

      if (await ops.commit()) {
        steps.splice(0, sendSteps)
        ownRichContent.push(generateId())
        return
      }
    }
    // retry in case of failure
    clearTimeout(applyTimer)
    applyTimer = setTimeout(applySteps, 100 + Math.random() * 500)
  }

  onMount(() => {
    ph.then(() => {
      editor = new Editor({
        element,
        content: content,
        extensions: [
          StarterKit,
          Highlight,
          Link.configure({ openOnClick: false }),
          // ...(supportSubmit ? [Handle] : []), // order important
          // Typography, // we need to disable 1/2 -> ½ rule (https://github.com/hcengineering/anticrm/issues/345)
          Placeholder.configure({ placeholder: placeHolderStr }),
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
        onBlur: ({ event }) => {
          focused = false
          dispatch('blur', event)
          applySteps()
        },
        onFocus: () => {
          focused = true
          dispatch('focus', editor.getHTML())
        },
        onUpdate: (op: { editor: Editor; transaction: Transaction }) => {
          if (op.transaction.docChanged) {
            steps = steps.concat(unconfirmedFrom(op.transaction))

            clearTimeout(applyTimer)
            applyTimer = setTimeout(applySteps, defaultTimeout)
          }

          content = editor.getHTML()
        },
        onSelectionUpdate: () => dispatch('selection-update')
      })
    })
  })

  onDestroy(() => {
    applySteps()
    if (editor) {
      editor.destroy()
    }
  })
</script>

<div class="select-text" style="width: 100%;" bind:this={element} />

<style lang="scss" global>
  .ProseMirror {
    flex-grow: 1;
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
