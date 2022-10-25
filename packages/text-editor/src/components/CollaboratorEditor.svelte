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

  import { Editor, HTMLContent } from '@tiptap/core'
  import Highlight from '@tiptap/extension-highlight'
  import Link from '@tiptap/extension-link'
  // import Typography from '@tiptap/extension-typography'
  import Placeholder from '@tiptap/extension-placeholder'
  // import Collab from '@tiptap/extension-collaboration'
  import Collaboration from '@tiptap/extension-collaboration'
  import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
  import TaskItem from '@tiptap/extension-task-item'
  import TaskList from '@tiptap/extension-task-list'
  import StarterKit from '@tiptap/starter-kit'
  import { Transaction } from 'prosemirror-state'
  import { createEventDispatcher, onDestroy, onMount } from 'svelte'

  import { EmployeeAccount } from '@hcengineering/contact'
  import { getCurrentAccount } from '@hcengineering/core'
  import { getPlatformColorForText, IconSize, showPopup } from '@hcengineering/ui'
  import { WebsocketProvider } from 'y-websocket'
  import * as Y from 'yjs'
  import StyleButton from './StyleButton.svelte'

  import textEditorPlugin from '../plugin'
  import { FormatMode, FORMAT_MODES } from '../types'
  import Bold from './icons/Bold.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'
  import Italic from './icons/Italic.svelte'
  import LinkEl from './icons/Link.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import ListNumber from './icons/ListNumber.svelte'
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

  onMount(() => {
    ph.then(() => {
      editor = new Editor({
        element,
        editable: !readonly,
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
          // UniqId,
          Collaboration.configure({
            document: ydoc
          }),
          CollaborationCursor.configure({
            provider: wsProvider,
            user: {
              name: currentUser.name,
              color: getPlatformColorForText(currentUser.email)
            }
          })
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
          dispatch('focus', editor.getHTML())
        },
        onUpdate: (op: { editor: Editor; transaction: Transaction }) => {
          dispatch('content', editor.getHTML())
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

  function updateFormattingState () {
    activeModes = new Set(FORMAT_MODES.filter(checkIsActive))
    isSelectionEmpty = editor.view.state.selection.empty
  }

  function getToggler (toggle: () => void) {
    return () => {
      toggle()
      needFocus = true
      updateFormattingState()
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
</script>

<div class="ref-container">
  {#if isFormatting && !readonly}
    <div class="formatPanel buttons-group xsmall-gap mb-4">
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
  <div class="textInput" class:focusable>
    <div class="select-text" style="width: 100%;" bind:this={element} />
  </div>
</div>

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
  /* Placeholder (at the top) */
  .ProseMirror p.is-editor-empty:first-child::before {
    color: #adb5bd;
    content: attr(data-placeholder);
    float: left;
    height: 0;
    pointer-events: none;
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
</style>
