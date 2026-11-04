<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023, 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { Analytics } from '@hcengineering/analytics'
  import { type Blob, Markup, type Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { getPrintContext } from '@hcengineering/presentation'
  import { EmptyMarkup, getMarkup, markupToJSON } from '@hcengineering/text'
  import textEditor from '@hcengineering/text-editor'
  import { getRenderContext, themeStore, trackRenderResource } from '@hcengineering/ui'
  import { Content, Editor, FocusPosition, mergeAttributes } from '@tiptap/core'
  import { ParseOptions } from '@tiptap/pm/model'
  import { EditorView } from '@tiptap/pm/view'
  import { createEventDispatcher, getAllContexts, onDestroy, onMount } from 'svelte'

  import { EditorKitOptions, getEditorKit } from '../../src/kits/editor-kit'
  import { deleteAttachment } from '../command/deleteAttachment'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { updateEditorContext } from './extension/editorContext'

  export let content: Markup = EmptyMarkup
  export let editable: boolean = true
  export let placeholder: IntlString = textEditor.string.EditorPlaceholder
  export let placeholderParams: Record<string, any> = {}
  export let supportSubmit = true
  export let editorAttributes: Record<string, string> = {}
  export let spellcheck: boolean = true
  export let boundary: HTMLElement | undefined = undefined
  export let autofocus: FocusPosition = false
  export let onPaste: ((view: EditorView, event: ClipboardEvent) => boolean) | undefined = undefined
  export let kitOptions: Partial<EditorKitOptions> = {}
  export let onKeyDown: ((view: EditorView, event: KeyboardEvent) => boolean) | undefined = undefined

  let element: HTMLElement
  let editor: Editor
  let destroyed = false

  $: if (editor !== undefined && editor.isEditable !== editable) {
    editor.setEditable(editable)
  }

  const dispatch = createEventDispatcher()
  const printContext = getPrintContext()
  const svelteContext = getAllContexts()
  const rendering = getRenderContext()
  let loadingContent = true
  const trackLoading = trackRenderResource()
  $: trackLoading(loadingContent)

  export function isEditable (): boolean {
    return editor?.isEditable
  }
  export function setEditable (value: boolean): void {
    editable = value
    if (editor !== undefined && editor.isEditable !== editable) {
      editor.setEditable(editable)
    }
  }
  export function submit (): void {
    content = getContent()
    dispatch('content', content)
  }
  export function getContent (): Markup {
    return getMarkup(editor)
  }
  export function setContent (newContent: Markup): void {
    if (editor !== undefined && content !== newContent) {
      content = newContent
      editor.commands.setContent(markupToJSON(content))
    }
  }
  export function clear (): void {
    if (editor !== undefined) {
      content = EmptyMarkup

      editor.commands.clearContent(true)
    }
  }
  export function getEditor (): Editor {
    return editor
  }

  export function insertEmoji (text: string, image?: Ref<Blob>): void {
    editor?.commands.insertEmoji(text, image === undefined ? 'unicode' : 'image', image)
  }

  export function insertText (text: string): void {
    editor?.commands.insertContent(text)
  }
  export function insertTable (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) {
    editor?.commands.insertTable(options)
  }
  export function insertCodeBlock (pos?: number): void {
    editor?.commands.insertContent(
      {
        type: 'codeBlock',
        content: [{ type: 'text', text: ' ' }]
      },
      {
        updateSelection: false
      }
    )

    if (pos !== undefined) {
      editor?.commands.focus(pos, { scrollIntoView: false })
    }
  }
  export function insertSeparatorLine (): void {
    editor?.commands.setHorizontalRule()
  }
  export function insertContent (
    value: Content,
    options?: {
      parseOptions?: ParseOptions
      updateSelection?: boolean
    }
  ): void {
    editor?.commands.insertContent(value, options)
  }

  export function insertMarkup (markup: Markup): void {
    editor?.commands.insertContent(markupToJSON(markup))
  }

  // Kit options are applied only on mount, so keep the people scope in sync,
  // e.g. when a space is selected while creating a card.
  $: if (editor != null && kitOptions.peopleScope !== undefined) {
    updateEditorContext(editor, { peopleScope: kitOptions.peopleScope })
  }

  let needFocus = false
  let focused = false
  let posFocus: FocusPosition | undefined = undefined

  export function focus (position?: FocusPosition): void {
    posFocus = position
    needFocus = true
  }

  $: if (editor != null && needFocus) {
    if (!focused) {
      editor.commands.focus(posFocus)
      posFocus = undefined
    }
    needFocus = false
  }

  async function initialize (): Promise<void> {
    const kit = await getEditorKit(
      {
        printContext,
        getSvelteContext: () => svelteContext,
        mode: 'compact',

        drawingBoard: false,
        textAlign: false,
        reference: false,
        emoji: false,
        placeholder: {
          placeholderIntl: placeholder,
          placeholderIntlParams: placeholderParams,
          themeStore
        },
        submit: supportSubmit ? { submit } : false
      },
      kitOptions
    )

    if (destroyed) return

    editor = new Editor({
      editable,
      enableContentCheck: true,
      element,
      editorProps: {
        attributes: mergeAttributes(defaultEditorAttributes, editorAttributes, {
          spellcheck: spellcheck ? 'true' : 'false'
        }),
        handlePaste: onPaste,
        handleKeyDown: (view, event) => {
          if (onKeyDown !== undefined) {
            return onKeyDown(view, event)
          }
          return false
        }
      },
      content: markupToJSON(content),
      autofocus: editable ? autofocus : false,
      extensions: [kit],
      onCreate: () => {
        loadingContent = false
      },
      parseOptions: {
        preserveWhitespace: 'full'
      },
      onTransaction: () => {
        // force re-render so `editor.isActive` works as expected
        editor = editor
      },
      onBlur: () => {
        focused = false
        dispatch('blur')
      },
      onFocus: () => {
        focused = true
        dispatch('focus')
      },
      onUpdate: ({ transaction }) => {
        if (!editable || !transaction.docChanged) return
        content = getContent()
        dispatch('value', content)
        dispatch('update', content)
      },
      onContentError: ({ error }) => {
        rendering?.fail(error)
        Analytics.handleError(error)
      }
    })
  }
  onMount(() => {
    void initialize().catch((error) => {
      rendering?.fail(error)
      loadingContent = false
      Analytics.handleError(error)
    })
  })

  onDestroy(() => {
    destroyed = true
    editor?.destroy()
  })

  /**
   * @public
   */
  export function removeAttachment (id: string): void {
    editor.commands.command(deleteAttachment(id))
  }

  function handleFocus (): void {
    needFocus = true
  }
</script>

<div class="select-text" style="width: 100%;" bind:this={element} />
