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
  import { IntlString, translate } from '@hcengineering/platform'

  import { Editor, Extension, HTMLContent } from '@tiptap/core'
  import Collaboration from '@tiptap/extension-collaboration'
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
  import Placeholder from '@tiptap/extension-placeholder'

  import { Plugin, PluginKey, Transaction } from 'prosemirror-state'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { getCurrentAccount, Markup } from '@hcengineering/core'
  import { getPlatformColorForText, IconObjects, IconSize, themeStore } from '@hcengineering/ui'
  import { WebsocketProvider } from 'y-websocket'
  import * as Y from 'yjs'
  import StyleButton from './StyleButton.svelte'

  import { DecorationSet } from 'prosemirror-view'
  import textEditorPlugin from '../plugin'
  import { CollaborationIds, TextFormatCategory } from '../types'

  import { getContext } from 'svelte'
  import { calculateDecorations } from './diff/decorations'
  import { defaultExtensions } from './extensions'
  import TextEditorStyleToolbar from './TextEditorStyleToolbar.svelte'

  export let documentId: string
  export let readonly = false
  export let visible = true

  export let token: string
  export let collaboratorURL: string

  export let isFormatting = true
  export let buttonSize: IconSize = 'small'
  export let focusable: boolean = false
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let initialContentId: string | undefined = undefined
  // export let suggestMode = false
  export let comparedVersion: Markup | ArrayBuffer | undefined = undefined

  export let field: string | undefined = undefined

  export let autoOverflow = false
  export let initialContent: string | undefined = undefined

  const ydoc = (getContext(CollaborationIds.Doc) as Y.Doc | undefined) ?? new Y.Doc()
  const contextProvider = getContext(CollaborationIds.Provider) as WebsocketProvider | undefined
  const wsProvider =
    contextProvider ??
    new WebsocketProvider(collaboratorURL, documentId, ydoc, {
      params: {
        token,
        documentId,
        initialContentId: initialContentId ?? ''
      }
    })

  if (contextProvider === undefined) {
    wsProvider?.on('status', (event: any) => {
      console.log(documentId, event.status) // logs "connected" or "disconnected"
    })
  }

  const currentUser = getCurrentAccount()

  let element: HTMLElement
  let editor: Editor

  let placeHolderStr: string = ''

  $: ph = translate(placeholder, {}, $themeStore.language).then((r) => {
    placeHolderStr = r
  })

  const dispatch = createEventDispatcher()

  export function clear (): void {
    editor.commands.clearContent(false)
  }
  export function insertText (text: string): void {
    editor.commands.insertContent(text as HTMLContent)
  }

  export function getHTML (): string | undefined {
    if (editor) {
      return editor.getHTML()
    }
  }

  export function checkIsSelectionEmpty () {
    return editor.view.state.selection.empty
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

  $: if (editor !== undefined) {
    editor.setEditable(!readonly)
  }

  // const isSuggestMode = () => suggestMode

  let _decoration = DecorationSet.empty
  let oldContent = ''

  function updateEditor (editor?: Editor, field?: string, comparedVersion?: Markup | ArrayBuffer): void {
    const r = calculateDecorations(editor, oldContent, field, comparedVersion)
    if (r !== undefined) {
      oldContent = r.oldContent
      _decoration = r.decorations
    }
  }

  const updateDecorations = () => {
    if (editor && editor.schema) {
      updateEditor(editor, field, comparedVersion)
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

  $: updateEditor(editor, field, comparedVersion)

  onMount(() => {
    ph.then(() => {
      editor = new Editor({
        element,
        // content: 'Hello world<br/> This is simple text<br/>Some more text<br/>Yahoo <br/>Cool <br/><br/> Done',
        editable: true,
        extensions: [
          ...defaultExtensions,
          Placeholder.configure({ placeholder: placeHolderStr }),

          Collaboration.configure({
            document: ydoc,
            field
          }),
          CollaborationCursor.configure({
            provider: wsProvider,
            user: {
              name: currentUser.email,
              color: getPlatformColorForText(currentUser.email, $themeStore.dark)
            }
          }),
          DecorationExtension
          // ...extensions
        ],
        onTransaction: () => {
          // force re-render so `editor.isActive` works as expected
          editor = editor
        },
        onBlur: ({ event }) => {
          focused = false
          dispatch('blur', event)
        },
        onFocus: () => {
          focused = true
        },
        onUpdate: (op: { editor: Editor; transaction: Transaction }) => {
          dispatch('content', editor.getHTML())
        },
        onSelectionUpdate: () => {
          dispatch('selection-update')
        }
      })

      if (initialContent) {
        insertText(initialContent)
      }
    })
  })

  onDestroy(() => {
    if (editor) {
      try {
        editor.destroy()
      } catch (err: any) {}
      if (contextProvider === undefined) {
        wsProvider.disconnect()
      }
    }
  })

  let showDiff = true
</script>

{#if visible}
  <div class="ref-container" class:autoOverflow>
    {#if isFormatting && !readonly}
      <div class="formatPanelRef formatPanel flex-between clear-mins">
        <div class="flex-row-center buttons-group xsmall-gap">
          <TextEditorStyleToolbar
            textEditor={editor}
            textFormatCategories={[
              TextFormatCategory.Heading,
              TextFormatCategory.TextDecoration,
              TextFormatCategory.Link,
              TextFormatCategory.List,
              TextFormatCategory.Quote,
              TextFormatCategory.Code,
              TextFormatCategory.Table
            ]}
            formatButtonSize={buttonSize}
            on:focus={() => {
              needFocus = true
            }}
          />
        </div>
        <div class="flex-grow" />
        {#if comparedVersion !== undefined}
          <div class="flex-row-center buttons-group xsmall-gap">
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
            <slot name="tools" />
          </div>
        {:else}
          <div class="formatPanelRef formatPanel buttons-group xsmall-gap">
            <slot name="tools" />
          </div>
        {/if}
      </div>
    {:else if comparedVersion !== undefined}
      <div class="formatPanelRef formatPanel flex flex-grow flex-reverse">
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
        <slot name="tools" />
      </div>
    {/if}
    <div class="textInput" class:focusable>
      <div class="select-text" style="width: 100%;" bind:this={element} />
    </div>
  </div>
{/if}

<style lang="scss" global>
  .ProseMirror {
    flex-grow: 1;
    min-height: inherit !important;
    max-height: inherit !important;
    outline: none;
    line-height: 150%;
    color: var(--accent-color);

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
      color: var(--dark-color);
      pointer-events: none;
      height: 0;
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
  /* Placeholder (at the top) */
  .ProseMirror p.is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
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
  .autoOverflow {
    overflow: auto;
  }

  .ref-container .formatPanel {
    margin: -0.5rem -0.25rem 0.5rem;
    padding: 0.375rem;
    background-color: var(--theme-comp-header-color);
    border-radius: 0.5rem;
    box-shadow: var(--button-shadow);
    z-index: 1;
  }
  .ref-container:focus-within .formatPanel {
    position: sticky;
    top: 1.25rem;
  }
</style>
