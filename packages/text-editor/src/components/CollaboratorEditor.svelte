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
  import { getEmbeddedLabel, IntlString, translate } from '@hcengineering/platform'

  import { Editor, Extension, HTMLContent } from '@tiptap/core'
  import Collaboration from '@tiptap/extension-collaboration'
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
  import { Level } from '@tiptap/extension-heading'
  import Placeholder from '@tiptap/extension-placeholder'

  import { Plugin, PluginKey, Transaction } from 'prosemirror-state'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { getCurrentAccount, Markup } from '@hcengineering/core'
  import {
    getEventPositionElement,
    getPlatformColorForText,
    IconObjects,
    IconSize,
    SelectPopup,
    showPopup,
    themeStore
  } from '@hcengineering/ui'
  import { WebsocketProvider } from 'y-websocket'
  import * as Y from 'yjs'
  import StyleButton from './StyleButton.svelte'

  import presentation from '@hcengineering/presentation'

  import { DecorationSet } from 'prosemirror-view'
  import textEditorPlugin from '../plugin'
  import { CollaborationIds, FORMAT_MODES, FormatMode } from '../types'
  import Bold from './icons/Bold.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'

  import { getContext } from 'svelte'
  import { calculateDecorations } from './diff/decorations'
  import { defaultExtensions, headingLevels, mInsertTable } from './extensions'
  import Header from './icons/Header.svelte'
  import IconTable from './icons/IconTable.svelte'
  import Italic from './icons/Italic.svelte'
  import LinkEl from './icons/Link.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import ListNumber from './icons/ListNumber.svelte'
  import Quote from './icons/Quote.svelte'
  import Strikethrough from './icons/Strikethrough.svelte'
  import AddColAfter from './icons/table/AddColAfter.svelte'
  import AddColBefore from './icons/table/AddColBefore.svelte'
  import AddRowAfter from './icons/table/AddRowAfter.svelte'
  import AddRowBefore from './icons/table/AddRowBefore.svelte'
  import DeleteCol from './icons/table/DeleteCol.svelte'
  import DeleteRow from './icons/table/DeleteRow.svelte'
  import DeleteTable from './icons/table/DeleteTable.svelte'
  import LinkPopup from './LinkPopup.svelte'

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

  export function toggleBold () {
    editor.commands.toggleBold()
  }
  export function toggleItalic () {
    editor.commands.toggleItalic()
  }
  export function toggleStrike () {
    editor.commands.toggleStrike()
  }

  export function getHTML (): string | undefined {
    if (editor) {
      return editor.getHTML()
    }
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
          updateFormattingState()
        },
        onSelectionUpdate: () => {
          dispatch('selection-update')
          updateFormattingState()
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

  let activeModes = new Set<FormatMode>()
  let isSelectionEmpty = true

  export function checkIsActive (formatMode: FormatMode) {
    return editor.isActive(formatMode)
  }

  let headingLevel = 0

  function updateFormattingState () {
    activeModes = new Set(FORMAT_MODES.filter(checkIsActive))
    for (const l of headingLevels) {
      if (editor.isActive('heading', { level: l })) {
        headingLevel = l
        activeModes.add('heading')
      }
    }
    if (!activeModes.has('heading')) {
      headingLevel = 0
    }
    isSelectionEmpty = editor.view.state.selection.empty
  }

  function getToggler (toggle: () => void) {
    return () => {
      toggle()
      needFocus = true
      updateFormattingState()
    }
  }

  function toggleHeader (event: MouseEvent) {
    if (activeModes.has('heading')) {
      editor.commands.toggleHeading({ level: headingLevel as Level })
      needFocus = true
      updateFormattingState()
    } else {
      showPopup(
        SelectPopup,
        {
          value: Array.from(headingLevels).map((it) => ({ id: it.toString(), text: it.toString() }))
        },
        getEventPositionElement(event),
        (val) => {
          if (val !== undefined) {
            editor.commands.toggleHeading({ level: parseInt(val) as Level })
            needFocus = true
            updateFormattingState()
          }
        }
      )
    }
  }

  function insertTable (event: MouseEvent) {
    showPopup(
      SelectPopup,
      {
        value: [
          { id: '#delete', label: presentation.string.Remove },
          ...mInsertTable.map((it) => ({ id: it.label, text: it.label }))
        ]
      },
      getEventPositionElement(event),
      (val) => {
        if (val !== undefined) {
          if (val === '#delete') {
            editor.commands.deleteTable()
            needFocus = true
            updateFormattingState()
            return
          }
          const tab = mInsertTable.find((it) => it.label === val)
          if (tab) {
            editor.commands.insertTable({
              cols: tab.cols,
              rows: tab.rows,
              withHeaderRow: tab.header
            })

            needFocus = true
            updateFormattingState()
          }
        }
      }
    )
  }

  function tableOptions (event: MouseEvent) {
    const ops = [
      {
        id: '#addColumnBefore',
        icon: AddColBefore,
        label: textEditorPlugin.string.AddColumnBefore,
        action: () => editor.commands.addColumnBefore(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },
      {
        id: '#addColumnAfter',
        icon: AddColAfter,
        label: textEditorPlugin.string.AddColumnAfter,
        action: () => editor.commands.addColumnAfter(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },

      {
        id: '#deleteColumn',
        icon: DeleteCol,
        label: textEditorPlugin.string.DeleteColumn,
        action: () => editor.commands.deleteColumn(),
        category: {
          label: textEditorPlugin.string.CategoryColumn
        }
      },
      {
        id: '#addRowBefore',
        icon: AddRowBefore,
        label: textEditorPlugin.string.AddRowBefore,
        action: () => editor.commands.addRowBefore(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#addRowAfter',
        icon: AddRowAfter,
        label: textEditorPlugin.string.AddRowAfter,
        action: () => editor.commands.addRowAfter(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#deleteRow',
        icon: DeleteRow,
        label: textEditorPlugin.string.DeleteRow,
        action: () => editor.commands.deleteRow(),
        category: {
          label: textEditorPlugin.string.CategoryRow
        }
      },
      {
        id: '#deleteTable',
        icon: DeleteTable,
        label: textEditorPlugin.string.DeleteTable,
        action: () => editor.commands.deleteTable(),
        category: {
          label: textEditorPlugin.string.Table
        }
      }
    ]

    showPopup(
      SelectPopup,
      {
        value: ops
      },
      getEventPositionElement(event),
      (val) => {
        if (val !== undefined) {
          const op = ops.find((it) => it.id === val)
          if (op) {
            op.action()
            needFocus = true
            updateFormattingState()
          }
        }
      }
    )
  }

  async function formatLink (): Promise<void> {
    const link = editor.getAttributes('link').href

    showPopup(LinkPopup, { link }, undefined, undefined, (newLink) => {
      if (newLink === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()
      } else {
        editor.chain().focus().extendMarkRange('link').setLink({ href: newLink }).run()
      }
    })
  }
  let showDiff = true
</script>

{#if visible}
  <div class="ref-container" class:autoOverflow>
    {#if isFormatting && !readonly}
      <div class="formatPanelRef formatPanel flex-between clear-mins">
        <div class="flex-row-center buttons-group xsmall-gap">
          <StyleButton
            icon={Header}
            size={buttonSize}
            selected={activeModes.has('heading')}
            showTooltip={{ label: getEmbeddedLabel(`H${headingLevel}`) }}
            on:click={toggleHeader}
          />

          <StyleButton
            icon={Bold}
            size={buttonSize}
            selected={activeModes.has('bold')}
            showTooltip={{ label: textEditorPlugin.string.Bold }}
            on:click={getToggler(toggleBold)}
          />
          <StyleButton
            icon={Italic}
            size={buttonSize}
            selected={activeModes.has('italic')}
            showTooltip={{ label: textEditorPlugin.string.Italic }}
            on:click={getToggler(toggleItalic)}
          />
          <StyleButton
            icon={Strikethrough}
            size={buttonSize}
            selected={activeModes.has('strike')}
            showTooltip={{ label: textEditorPlugin.string.Strikethrough }}
            on:click={getToggler(toggleStrike)}
          />
          <StyleButton
            icon={LinkEl}
            size={buttonSize}
            selected={activeModes.has('link')}
            disabled={isSelectionEmpty && !activeModes.has('link')}
            showTooltip={{ label: textEditorPlugin.string.Link }}
            on:click={formatLink}
          />
          <div class="buttons-divider" />
          <StyleButton
            icon={ListNumber}
            size={buttonSize}
            selected={activeModes.has('orderedList')}
            showTooltip={{ label: textEditorPlugin.string.OrderedList }}
            on:click={getToggler(toggleOrderedList)}
          />
          <StyleButton
            icon={ListBullet}
            size={buttonSize}
            selected={activeModes.has('bulletList')}
            showTooltip={{ label: textEditorPlugin.string.BulletedList }}
            on:click={getToggler(toggleBulletList)}
          />
          <div class="buttons-divider" />
          <StyleButton
            icon={Quote}
            size={buttonSize}
            selected={activeModes.has('blockquote')}
            showTooltip={{ label: textEditorPlugin.string.Blockquote }}
            on:click={getToggler(toggleBlockquote)}
          />
          <div class="buttons-divider" />
          <StyleButton
            icon={Code}
            size={buttonSize}
            selected={activeModes.has('code')}
            showTooltip={{ label: textEditorPlugin.string.Code }}
            on:click={getToggler(toggleCode)}
          />
          <StyleButton
            icon={CodeBlock}
            size={buttonSize}
            selected={activeModes.has('codeBlock')}
            showTooltip={{ label: textEditorPlugin.string.CodeBlock }}
            on:click={getToggler(toggleCodeBlock)}
          />

          <StyleButton
            icon={IconTable}
            iconProps={{ style: 'table' }}
            size={buttonSize}
            selected={activeModes.has('table')}
            on:click={insertTable}
            showTooltip={{ label: textEditorPlugin.string.InsertTable }}
          />
          {#if activeModes.has('table')}
            <StyleButton
              icon={IconTable}
              iconProps={{ style: 'tableProps' }}
              size={buttonSize}
              on:click={tableOptions}
              showTooltip={{ label: textEditorPlugin.string.TableOptions }}
            />
          {/if}
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
