<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { IntlString } from '@hcengineering/platform'

  import { Scroller, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import textEditorPlugin from '../plugin'
  import EmojiPopup from './EmojiPopup.svelte'
  import Emoji from './icons/Emoji.svelte'
  import TextStyle from './icons/TextStyle.svelte'
  import TextEditor from './TextEditor.svelte'

  import { Asset } from '@hcengineering/platform'
  import { AnySvelteComponent } from '@hcengineering/ui'
  import { FormatMode, FORMAT_MODES, RefInputAction, TextEditorHandler } from '../types'
  import Bold from './icons/Bold.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'
  import Italic from './icons/Italic.svelte'
  import Link from './icons/Link.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import ListNumber from './icons/ListNumber.svelte'
  import Quote from './icons/Quote.svelte'
  import Strikethrough from './icons/Strikethrough.svelte'
  import LinkPopup from './LinkPopup.svelte'
  import StyleButton from './StyleButton.svelte'

  const dispatch = createEventDispatcher()

  export let content: string = ''
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let showButtons: boolean = true
  export let isScrollable: boolean = true
  export let focusable: boolean = false
  export let maxHeight: 'max' | 'card' | string = 'max'
  export let withoutTopBorder = false
  export let useReferences = false

  let textEditor: TextEditor

  export function submit (): void {
    textEditor.submit()
  }
  export function focus (): void {
    textEditor.focus()
  }

  $: varsStyle = maxHeight === 'card' ? 'calc(70vh - 12.5rem)' : maxHeight === 'max' ? 'max-content' : maxHeight

  let isFormatting = false
  let activeModes = new Set<FormatMode>()
  let isSelectionEmpty = true

  interface RefAction {
    label: IntlString
    icon: Asset | AnySvelteComponent
    action: RefInputAction
    order: number
  }
  const defActions: RefAction[] = [
    {
      label: textEditorPlugin.string.TextStyle,
      icon: TextStyle,
      action: () => {
        isFormatting = !isFormatting
        textEditor.focus()
      },
      order: 2000
    },
    {
      label: textEditorPlugin.string.Emoji,
      icon: Emoji,
      action: (element) => {
        showPopup(
          EmojiPopup,
          {},
          element,
          (emoji) => {
            if (!emoji) return
            textEditor.insertText(emoji)
            textEditor.focus()
          },
          () => {}
        )
      },
      order: 3000
    }
    // {
    //   label: textEditorPlugin.string.GIF,
    //   icon: GIF,
    //   action: () => {},
    //   order: 4000
    // }
  ]

  function updateFormattingState () {
    activeModes = new Set(FORMAT_MODES.filter(textEditor.checkIsActive))
    isSelectionEmpty = textEditor.checkIsSelectionEmpty()
  }

  function getToggler (toggle: () => void) {
    return () => {
      toggle()
      textEditor.focus()
      updateFormattingState()
    }
  }

  async function formatLink (): Promise<void> {
    const link = textEditor.getLink()

    showPopup(LinkPopup, { link }, undefined, undefined, (newLink) => {
      if (newLink === '') {
        textEditor.unsetLink()
      } else {
        textEditor.setLink(newLink)
      }
    })
  }
  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      textEditor.insertText(text)
    }
  }
  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }
</script>

<div class="ref-container">
  {#if isFormatting}
    <div class="formatPanel buttons-group xsmall-gap mb-4" class:withoutTopBorder>
      <StyleButton
        icon={Bold}
        size={'small'}
        selected={activeModes.has('bold')}
        showTooltip={{ label: textEditorPlugin.string.Bold }}
        on:click={getToggler(textEditor.toggleBold)}
      />
      <StyleButton
        icon={Italic}
        size={'small'}
        selected={activeModes.has('italic')}
        showTooltip={{ label: textEditorPlugin.string.Italic }}
        on:click={getToggler(textEditor.toggleItalic)}
      />
      <StyleButton
        icon={Strikethrough}
        size={'small'}
        selected={activeModes.has('strike')}
        showTooltip={{ label: textEditorPlugin.string.Strikethrough }}
        on:click={getToggler(textEditor.toggleStrike)}
      />
      <StyleButton
        icon={Link}
        size={'small'}
        selected={activeModes.has('link')}
        disabled={isSelectionEmpty && !activeModes.has('link')}
        showTooltip={{ label: textEditorPlugin.string.Link }}
        on:click={formatLink}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={ListNumber}
        size={'small'}
        selected={activeModes.has('orderedList')}
        showTooltip={{ label: textEditorPlugin.string.OrderedList }}
        on:click={getToggler(textEditor.toggleOrderedList)}
      />
      <StyleButton
        icon={ListBullet}
        size={'small'}
        selected={activeModes.has('bulletList')}
        showTooltip={{ label: textEditorPlugin.string.BulletedList }}
        on:click={getToggler(textEditor.toggleBulletList)}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={Quote}
        size={'small'}
        selected={activeModes.has('blockquote')}
        showTooltip={{ label: textEditorPlugin.string.Blockquote }}
        on:click={getToggler(textEditor.toggleBlockquote)}
      />
      <div class="buttons-divider" />
      <StyleButton
        icon={Code}
        size={'small'}
        selected={activeModes.has('code')}
        showTooltip={{ label: textEditorPlugin.string.Code }}
        on:click={getToggler(textEditor.toggleCode)}
      />
      <StyleButton
        icon={CodeBlock}
        size={'small'}
        selected={activeModes.has('codeBlock')}
        showTooltip={{ label: textEditorPlugin.string.CodeBlock }}
        on:click={getToggler(textEditor.toggleCodeBlock)}
      />
    </div>
  {/if}
  <div class="textInput" class:focusable>
    <div class="inputMsg" class:scrollable={isScrollable} style="--texteditor-maxheight: {varsStyle};">
      {#if isScrollable}
        <Scroller>
          <TextEditor
            bind:content
            {placeholder}
            bind:this={textEditor}
            on:value
            on:content={(ev) => {
              dispatch('message', ev.detail)
              content = ''
              textEditor.clear()
            }}
            on:blur
            on:focus
            supportSubmit={false}
            on:selection-update={updateFormattingState}
          />
        </Scroller>
      {:else}
        <TextEditor
          bind:content
          {placeholder}
          bind:this={textEditor}
          on:value
          on:content={(ev) => {
            dispatch('message', ev.detail)
            content = ''
            textEditor.clear()
          }}
          on:blur
          on:focus
          supportSubmit={false}
          on:selection-update={updateFormattingState}
        />
      {/if}
    </div>
  </div>
  {#if showButtons}
    <div class="buttons">
      {#each defActions as a}
        <div class="p-1">
          <StyleButton icon={a.icon} size={'large'} on:click={(evt) => handleAction(a, evt)} />
        </div>
      {/each}
      <div class="flex-grow">
        <slot />
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .ref-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    min-height: 4.5rem;

    .textInput {
      flex-grow: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      min-height: 2.75rem;
      background-color: transparent;

      .inputMsg {
        align-self: stretch;
        width: 100%;
        color: var(--content-color);
        background-color: transparent;

        :global(.ProseMirror) {
          min-height: 0;
          max-height: 100%;
          height: 100%;
        }

        &.scrollable {
          overflow: auto;
          max-height: var(--texteditor-maxheight);
        }
      }

      &.focusable {
        margin: -0.25rem -0.5rem;
        padding: 0.25rem 0.5rem;
        border: 1px solid transparent;
        border-radius: 0.25rem;

        &:focus-within {
          border-color: var(--primary-edit-border-color);
        }
      }
    }
    .buttons {
      display: flex;
      align-items: center;
    }
  }
</style>
