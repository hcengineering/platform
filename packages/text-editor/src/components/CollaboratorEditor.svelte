<!--
//
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
  import { DecorationSet } from 'prosemirror-view'
  import { getContext, createEventDispatcher, onDestroy, onMount } from 'svelte'
  import * as Y from 'yjs'
  import { HocuspocusProvider } from '@hocuspocus/provider'
  import { AnyExtension, Editor, Extension, HTMLContent, getMarkRange } from '@tiptap/core'
  import Collaboration, { isChangeOrigin } from '@tiptap/extension-collaboration'
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
  import Placeholder from '@tiptap/extension-placeholder'
  import { getCurrentAccount, Markup } from '@hcengineering/core'
  import { IntlString, translate } from '@hcengineering/platform'
  import { getPlatformColorForText, IconObjects, IconSize, themeStore } from '@hcengineering/ui'

  import textEditorPlugin from '../plugin'
  import { CollaborationIds, TextFormatCategory, TextNodeAction } from '../types'

  import { calculateDecorations } from './diff/decorations'
  import { defaultExtensions } from './extensions'
  import { InlineStyleToolbar } from './extension/inlineStyleToolbar'
  import { NodeUuidExtension } from './extension/nodeUuid'
  import StyleButton from './StyleButton.svelte'
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
  export let comparedVersion: Markup | ArrayBuffer | undefined = undefined

  export let field: string | undefined = undefined

  export let autoOverflow = false
  export let initialContent: string | undefined = undefined
  export let textNodeActions: TextNodeAction[] = []
  export let onExtensions: () => AnyExtension[] = () => []

  let element: HTMLElement

  const ydoc = (getContext(CollaborationIds.Doc) as Y.Doc | undefined) ?? new Y.Doc()

  const contextProvider = getContext(CollaborationIds.Provider) as HocuspocusProvider | undefined

  const provider =
    contextProvider ??
    new HocuspocusProvider({
      url: collaboratorURL,
      name: documentId,
      document: ydoc,
      token,
      parameters: {
        initialContentId: initialContentId ?? ''
      }
    })

  if (contextProvider === undefined) {
    provider?.on('status', (event: any) => {
      console.log(documentId, event.status) // logs "connected" or "disconnected"
    })
  }

  const currentUser = getCurrentAccount()

  let editor: Editor
  let inlineToolbar: HTMLElement
  let showInlineToolbar = false

  let placeHolderStr: string = ''

  $: ph = translate(placeholder, {}, $themeStore.language).then((r) => {
    placeHolderStr = r
  })

  const dispatch = createEventDispatcher()

  export function getHTML (): string | undefined {
    if (editor) {
      return editor.getHTML()
    }
  }

  export function selectNode (uuid: string) {
    if (!editor) {
      return
    }

    const { doc, schema, tr } = editor.view.state
    let foundNode = false
    doc.descendants((node, pos) => {
      if (foundNode) {
        return false
      }

      const nodeUuidMark = node.marks.find(
        (mark) => mark.type.name === NodeUuidExtension.name && mark.attrs[NodeUuidExtension.name] === uuid
      )

      if (!nodeUuidMark) {
        return
      }

      foundNode = true

      // the first pos does not contain the mark, so we need to add 1 (pos + 1) to get the correct range
      const range = getMarkRange(doc.resolve(pos + 1), schema.marks[NodeUuidExtension.name])

      if (!range) {
        return false
      }

      const [$start, $end] = [doc.resolve(range.from), doc.resolve(range.to)]

      editor.view.dispatch(tr.setSelection(new TextSelection($start, $end)))
      needFocus = true
    })
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
        editable: true,
        extensions: [
          ...defaultExtensions,
          Placeholder.configure({ placeholder: placeHolderStr }),
          InlineStyleToolbar.configure({
            element: inlineToolbar,
            getEditorElement: () => element,
            isShown: () => !readonly && showInlineToolbar
          }),
          Collaboration.configure({
            document: ydoc,
            field
          }),
          CollaborationCursor.configure({
            provider,
            user: {
              name: currentUser.email,
              color: getPlatformColorForText(currentUser.email, $themeStore.dark)
            }
          }),
          DecorationExtension,
          ...onExtensions()
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
        onUpdate: ({ editor, transaction }) => {
          showInlineToolbar = false

          // ignore non-document changes
          if (!transaction.docChanged) return

          // TODO this is heavy and should be replaced with more lightweight event
          dispatch('content', editor.getHTML())

          // ignore non-local changes
          if (!isChangeOrigin(transaction)) return

          dispatch('update')
        },
        onSelectionUpdate: () => {
          showInlineToolbar = false
        }
      })

      if (initialContent) {
        editor.commands.insertContent(initialContent as HTMLContent)
      }
    })
  })

  onDestroy(() => {
    if (editor) {
      try {
        editor.destroy()
      } catch (err: any) {}
      if (contextProvider === undefined) {
        provider.configuration.websocketProvider.disconnect()
        provider.destroy()
      }
    }
  })

  function onEditorClick () {
    if (!editor.isEmpty) {
      showInlineToolbar = true
    }
  }

  let showDiff = true
</script>

<slot />
{#if visible}
  {#if comparedVersion !== undefined || $$slots.tools}
    <div class="ref-container" class:autoOverflow>
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
  {/if}

  <div class="formatPanel buttons-group xsmall-gap mb-4" bind:this={inlineToolbar}>
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
      {textNodeActions}
      on:focus={() => {
        needFocus = true
      }}
      on:action={(event) => {
        dispatch('action', { action: event.detail, editor })
        needFocus = true
      }}
    />
  </div>

  <div class="ref-container" class:autoOverflow>
    <div class="textInput" class:focusable>
      <div class="select-text" style="width: 100%;" on:mousedown={onEditorClick} bind:this={element} />
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

  .formatPanel {
    margin: -0.5rem -0.25rem 0.5rem;
    padding: 0.375rem;
    background-color: var(--theme-comp-header-color);
    border-radius: 0.5rem;
    box-shadow: var(--theme-popup-shadow);
    z-index: 1;
  }
</style>
