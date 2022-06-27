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
  import { IntlString } from '@anticrm/platform'

  import { Scroller, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import Emoji from './icons/Emoji.svelte'
  import GIF from './icons/GIF.svelte'
  import TextStyle from './icons/TextStyle.svelte'
  import EmojiPopup from './EmojiPopup.svelte'
  import TextEditor from './TextEditor.svelte'
  import textEditorPlugin from '../plugin'

  const dispatch = createEventDispatcher()

  export let content: string = ''
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let showButtons: boolean = true
  export let isScrollable: boolean = true
  export let focusable: boolean = false
  export let maxHeight: 'max' | 'card' | string = 'max'

  let textEditor: TextEditor

  export function submit (): void {
    textEditor.submit()
  }
  export function focus (): void {
    textEditor.focus()
  }

  function openEmojiPopup (ev: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    showPopup(EmojiPopup, {}, ev.target as HTMLElement, (emoji) => {
      if (!emoji) return
      textEditor.insertText(emoji)
    })
  }
  $: varsStyle = maxHeight === 'card' ? 'calc(70vh - 12.5rem)' : maxHeight === 'max' ? 'max-content' : maxHeight
</script>

<div class="ref-container">
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
        />
      {/if}
    </div>
  </div>
  {#if showButtons}
    <div class="buttons">
      <div class="tool"><TextStyle size={'large'} /></div>
      <div class="tool" on:click={openEmojiPopup}><Emoji size={'large'} /></div>
      <div class="tool"><GIF size={'large'} /></div>
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
      margin: 10px 0 0 8px;
      display: flex;
      align-items: center;

      .tool {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 20px;
        height: 20px;
        opacity: 0.3;
        cursor: pointer;
        &:hover {
          opacity: 1;
        }
      }
      .tool + .tool {
        margin-left: 16px;
      }
    }
  }
</style>
