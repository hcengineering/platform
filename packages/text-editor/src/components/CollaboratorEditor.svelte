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
  import Highlight from '@tiptap/extension-highlight'
  import Link from '@tiptap/extension-link'
  import Placeholder from '@tiptap/extension-placeholder'
  import Collaboration from '@tiptap/extension-collaboration'
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
  import Heading, { Level } from '@tiptap/extension-heading'
  import TaskItem from '@tiptap/extension-task-item'
  import TaskList from '@tiptap/extension-task-list'

  import StarterKit from '@tiptap/starter-kit'
  import { Plugin, PluginKey, Transaction } from 'prosemirror-state'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { EmployeeAccount } from '@hcengineering/contact'
  import { getCurrentAccount, Markup } from '@hcengineering/core'
  import { getEventPositionElement, getPlatformColorForText, IconSize, SelectPopup, showPopup } from '@hcengineering/ui'
  import { WebsocketProvider } from 'y-websocket'
  import * as Y from 'yjs'
  import StyleButton from './StyleButton.svelte'

  import TipTapCodeBlock from '@tiptap/extension-code-block'
  import Gapcursor from '@tiptap/extension-gapcursor'
  import { DecorationSet } from 'prosemirror-view'
  import textEditorPlugin from '../plugin'
  import { FormatMode, FORMAT_MODES } from '../types'
  import Bold from './icons/Bold.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'

  import { calculateDecorations } from './diff/decorations'
  import Header from './icons/Header.svelte'
  import Italic from './icons/Italic.svelte'
  import LinkEl from './icons/Link.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import ListNumber from './icons/ListNumber.svelte'
  import Objects from './icons/Objects.svelte'
  import Quote from './icons/Quote.svelte'
  import Strikethrough from './icons/Strikethrough.svelte'
  import LinkPopup from './LinkPopup.svelte'

  export let documentId: string
  export let readonly = false

  export let token: string
  export let collaboratorURL: string
  export let isFormatting = true
  export let buttonSize: IconSize = 'small'
  export let focusable: boolean = false
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let initialContentId: string | undefined = undefined
  export let suggestMode = false
  export let comparedVersion: Markup | undefined = undefined

  export let headingLevels: Level[] = [1, 2, 3, 4]

  const ydoc = new Y.Doc()
  const wsProvider = new WebsocketProvider(collaboratorURL, documentId, ydoc, {
    params: {
      token,
      documentId,
      initialContentId: initialContentId ?? ''
    }
  })

  wsProvider.on('status', (event: any) => {
    console.log(documentId, event.status) // logs "connected" or "disconnected"
  })

  const currentUser = getCurrentAccount() as EmployeeAccount

  let element: HTMLElement
  let editor: Editor

  let placeHolderStr: string = ''

  $: ph = translate(placeholder, {}).then((r) => {
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

  export function getHTML (): string {
    return editor.getHTML()
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

  function updateEditor (editor?: Editor, comparedVersion?: Markup): void {
    const r = calculateDecorations(editor, oldContent, comparedVersion)
    if (r !== undefined) {
      oldContent = r.oldContent
      _decoration = r.decorations
    }
  }

  const updateDecorations = () => {
    if (editor && editor.schema) {
      updateEditor(editor, comparedVersion)
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

  $: updateEditor(editor, comparedVersion)

  onMount(() => {
    ph.then(() => {
      editor = new Editor({
        element,
        // content: 'Hello world<br/> This is simple text<br/>Some more text<br/>Yahoo <br/>Cool <br/><br/> Done',
        editable: true,
        extensions: [
          StarterKit,
          Highlight.configure({
            multicolor: false
          }),
          TipTapCodeBlock.configure({
            languageClassPrefix: 'language-',
            exitOnArrowDown: true,
            exitOnTripleEnter: true,
            HTMLAttributes: {
              class: 'code-block'
            }
          }),
          Gapcursor,
          Heading.configure({
            levels: headingLevels
          }),
          // ChangeHighlight,
          // ChangesetExtension.configure({
          //   isSuggestMode
          // }),
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
          Collaboration.configure({
            document: ydoc
          }),
          CollaborationCursor.configure({
            provider: wsProvider,
            user: {
              name: currentUser.name,
              color: getPlatformColorForText(currentUser.email)
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
          // _decoration = DecorationSet.empty
          dispatch('content', editor.getHTML())
          updateFormattingState()
        },
        onSelectionUpdate: () => {
          dispatch('selection-update')
          updateFormattingState()
        }
      })
    })
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
      wsProvider.disconnect()
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
          value: Array.from(headingLevels).map((it) => ({ id: it.toString(), label: it.toString() }))
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

<div class="ref-container">
  <div class="flex">
    {#if isFormatting && !readonly}
      <div class="formatPanel buttons-group xsmall-gap mb-4">
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
      </div>
    {/if}
    <div class="flex-grow" />
    {#if comparedVersion !== undefined}
      <div class="formatPanel buttons-group xsmall-gap mb-4">
        <StyleButton
          icon={Objects}
          size={buttonSize}
          selected={showDiff}
          showTooltip={{ label: textEditorPlugin.string.EnableDiffMode }}
          on:click={() => {
            showDiff = !showDiff
            editor.chain().focus()
          }}
        />
      </div>
    {/if}
  </div>
  <div class="textInput" class:focusable>
    <div class="select-text" style="width: 100%;" bind:this={element} />
  </div>
</div>

<style lang="scss" global>
  .ProseMirror {
    flex-grow: 1;
    overflow: auto;
    max-height: 60vh;
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
      background-color: var(--theme-bg-accent-hover);
    }
    &::-webkit-scrollbar-corner {
      background-color: var(--theme-bg-accent-hover);
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

  .code-block {
    border: 1px solid var(--divider-color);
    border-radius: 4px;
    padding: 0.5rem;
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
</style>
