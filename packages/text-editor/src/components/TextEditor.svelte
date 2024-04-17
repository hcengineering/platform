<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2023 Hardcore Engineering Inc.
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
  import { Markup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { EmptyMarkup, getMarkup, markupToJSON } from '@hcengineering/text'
  import { themeStore } from '@hcengineering/ui'

  import { AnyExtension, Content, Editor, FocusPosition, mergeAttributes } from '@tiptap/core'
  import Placeholder from '@tiptap/extension-placeholder'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { deleteAttachment } from '../command/deleteAttachment'
  import textEditorPlugin from '../plugin'
  import { TextFormatCategory } from '../types'

  import ImageStyleToolbar from './ImageStyleToolbar.svelte'
  import TextEditorStyleToolbar from './TextEditorStyleToolbar.svelte'
  import { defaultEditorAttributes } from './editor/editorProps'
  import { InlinePopupExtension } from './extension/inlinePopup'
  import { InlineStyleToolbarExtension } from './extension/inlineStyleToolbar'
  import { SubmitExtension } from './extension/submit'
  import { EditorKit } from '../kits/editor-kit'
  import { FileAttachFunction } from './extension/types'
  import { ParseOptions } from '@tiptap/pm/model'

  export let content: Markup = EmptyMarkup
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let extensions: AnyExtension[] = []
  export let textFormatCategories: TextFormatCategory[] = []
  export let supportSubmit = true
  export let editorAttributes: Record<string, string> = {}
  export let boundary: HTMLElement | undefined = undefined
  export let autofocus: FocusPosition = false
  export let attachFile: FileAttachFunction | undefined = undefined

  let element: HTMLElement
  let editor: Editor

  let placeHolderStr: string = ''

  $: ph = translate(placeholder, {}, $themeStore.language).then((r) => {
    placeHolderStr = r
  })

  const dispatch = createEventDispatcher()

  export function isEditable (): boolean {
    return editor.isEditable
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
    if (content !== newContent) {
      content = newContent
      editor.commands.setContent(markupToJSON(content))
    }
  }
  export function clear (): void {
    content = EmptyMarkup

    editor.commands.clearContent(true)
  }

  export function insertText (text: string): void {
    editor.commands.insertContent(text)
  }
  export function insertTable (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) {
    editor.commands.insertTable(options)
  }
  export function insertCodeBlock (pos?: number): void {
    editor.commands.insertContent(
      {
        type: 'codeBlock',
        content: [{ type: 'text', text: ' ' }]
      },
      {
        updateSelection: false
      }
    )

    if (pos !== undefined) {
      editor.commands.focus(pos, { scrollIntoView: false })
    }
  }
  export function insertSeparatorLine (): void {
    editor.commands.setHorizontalRule()
  }
  export function insertContent (
    value: Content,
    options?: {
      parseOptions?: ParseOptions
      updateSelection?: boolean
    }
  ): void {
    editor.commands.insertContent(value, options)
  }

  export function insertMarkup (markup: Markup): void {
    editor.commands.insertContent(markupToJSON(markup))
  }

  let needFocus = false
  let focused = false
  let posFocus: FocusPosition | undefined = undefined
  let textToolbarElement: HTMLElement
  let imageToolbarElement: HTMLElement

  $: tippyOptions = {
    zIndex: 100000,
    popperOptions: {
      modifiers: [
        {
          name: 'preventOverflow',
          options: {
            boundary,
            padding: 8,
            altAxis: true,
            tether: false
          }
        }
      ]
    }
  }

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

  const Handle = SubmitExtension.configure({ submit })

  onMount(() => {
    void ph.then(() => {
      editor = new Editor({
        element,
        editorProps: { attributes: mergeAttributes(defaultEditorAttributes, editorAttributes) },
        content: markupToJSON(content),
        autofocus,
        extensions: [
          EditorKit,
          ...(supportSubmit ? [Handle] : []), // order important
          Placeholder.configure({ placeholder: placeHolderStr }),
          ...extensions,
          InlineStyleToolbarExtension.configure({
            tippyOptions,
            // TODO: Toolbar element is updated on every component update,
            //  but extensions is created only on mount. This causes issues when
            //  you're trying to use TextEditor in long-living components that
            //  get updated, e.g. in QuestionCollectionItemEditor in Surveys
            element: textToolbarElement,
            isSupported: () => true
          }),
          InlinePopupExtension.configure({
            pluginKey: 'show-image-actions-popup',
            // TODO: Toolbar element is updated on every component update,
            //  but extensions is created only on mount. This causes issues when
            //  you're trying to use TextEditor in long-living components that
            //  get updated, e.g. in QuestionCollectionItemEditor in Surveys
            element: imageToolbarElement,
            tippyOptions: {
              ...tippyOptions,
              appendTo: () => boundary ?? element
            },
            shouldShow: ({ editor }) => editor.isEditable && editor.isActive('image')
          })
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

<div bind:this={textToolbarElement} class="text-editor-toolbar buttons-group xsmall-gap mb-4">
  <TextEditorStyleToolbar textEditor={editor} {textFormatCategories} on:focus={handleFocus} />
</div>

<div bind:this={imageToolbarElement} class="text-editor-toolbar buttons-group xsmall-gap mb-4">
  <ImageStyleToolbar textEditor={editor} on:focus={handleFocus} />
</div>

<div class="select-text" style="width: 100%;" bind:this={element} />

<style lang="scss">
  .text-editor-toolbar {
    margin: -0.5rem -0.25rem 0.5rem;
    padding: 0.375rem;
    background-color: var(--theme-comp-header-color);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
    z-index: 1;
  }
</style>
