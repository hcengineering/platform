<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023, 2024 Hardcore Engineering Inc.
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
  import { Markup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { EmptyMarkup, getMarkup, markupToJSON } from '@hcengineering/text'
  import { themeStore } from '@hcengineering/ui'
  import textEditor from '@hcengineering/text-editor'
  import { AnyExtension, Content, Editor, FocusPosition, mergeAttributes } from '@tiptap/core'
  import Placeholder from '@tiptap/extension-placeholder'
  import { ParseOptions } from '@tiptap/pm/model'
  import { EditorView } from '@tiptap/pm/view'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { deleteAttachment } from '../command/deleteAttachment'
  import TextEditorToolbar from './TextEditorToolbar.svelte'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { getEditorKit } from '../../src/kits/editor-kit'

  export let content: Markup = EmptyMarkup
  export let placeholder: IntlString = textEditor.string.EditorPlaceholder
  export let placeholderParams: Record<string, any> = {}
  export let extensions: AnyExtension[] = []
  export let supportSubmit = true
  export let editorAttributes: Record<string, string> = {}
  export let boundary: HTMLElement | undefined = undefined
  export let autofocus: FocusPosition = false
  export let canEmbedFiles = true
  export let canEmbedImages = true
  export let onPaste: ((view: EditorView, event: ClipboardEvent) => boolean) | undefined = undefined

  let element: HTMLElement
  let editor: Editor

  let placeHolderStr: string = ''

  $: ph = translate(placeholder, placeholderParams, $themeStore.language).then((r) => {
    if (editor !== undefined && placeHolderStr !== r) {
      const placeholderIndex = editor.extensionManager.extensions.findIndex(
        (extension) => extension.name === 'placeholder'
      )
      if (placeholderIndex !== -1) {
        editor.extensionManager.extensions[placeholderIndex].options.placeholder = r
        editor.view.dispatch(editor.state.tr)
      }
    }
    placeHolderStr = r
  })

  const dispatch = createEventDispatcher()

  export function isEditable (): boolean {
    return editor?.isEditable
  }
  export function setEditable (editable: boolean): void {
    if (editor !== undefined) {
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

  let needFocus = false
  let focused = false
  let posFocus: FocusPosition | undefined = undefined
  let textToolbarElement: HTMLElement
  let imageToolbarElement: HTMLElement

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

  onMount(() => {
    void ph.then(async () => {
      editor = new Editor({
        enableContentCheck: true,
        element,
        editorProps: {
          attributes: mergeAttributes(defaultEditorAttributes, editorAttributes),
          handlePaste: onPaste
        },
        content: markupToJSON(content),
        autofocus,
        extensions: [
          (await getEditorKit()).configure({
            mode: 'compact',
            file: canEmbedFiles ? {} : false,
            image: canEmbedImages
              ? {
                  toolbar: {
                    element: imageToolbarElement,
                    boundary
                  }
                }
              : false,
            drawingBoard: false,
            textAlign: false,
            submit: supportSubmit ? { submit } : false,
            toolbar: {
              element: textToolbarElement,
              boundary
            }
          }),
          Placeholder.configure({ placeholder: placeHolderStr }),
          ...extensions
        ],
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
        onUpdate: () => {
          content = getContent()
          dispatch('value', content)
          dispatch('update', content)
        },
        onContentError: ({ error }) => {
          Analytics.handleError(error)
        }
      })
    })
  })

  onDestroy(() => {
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

<TextEditorToolbar bind:toolbar={textToolbarElement} {editor} on:focus={handleFocus} />

{#if canEmbedImages}
  <TextEditorToolbar bind:toolbar={imageToolbarElement} kind="image" {editor} on:focus={handleFocus} />
{/if}

<div class="select-text" style="width: 100%;" bind:this={element} />
