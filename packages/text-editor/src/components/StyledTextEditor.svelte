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
  import { createEventDispatcher } from 'svelte'
  import { AnyExtension, mergeAttributes } from '@tiptap/core'
  import { Node as ProseMirrorNode } from '@tiptap/pm/model'
  import { Asset, getResource, IntlString } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    Button,
    ButtonSize,
    EmojiPopup,
    IconEmoji,
    IconSize,
    Scroller,
    showPopup
  } from '@hcengineering/ui'

  import textEditorPlugin from '../plugin'
  import { RefInputAction, RefInputActionItem, TextEditorHandler, TextFormatCategory } from '../types'
  import Attach from './icons/Attach.svelte'
  import TextEditor from './TextEditor.svelte'

  const dispatch = createEventDispatcher()

  export let content: string = ''
  export let placeholder: IntlString = textEditorPlugin.string.EditorPlaceholder
  export let showButtons: boolean = true
  export let hideAttachments: boolean = false
  export let buttonSize: ButtonSize = 'medium'
  export let formatButtonSize: IconSize = 'small'
  export let isScrollable: boolean = true
  export let focusable: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string | undefined = undefined
  export let autofocus = false
  export let full = false
  export let extensions: AnyExtension[] = []
  export let editorAttributes: { [name: string]: string } = {}
  export let boundary: HTMLElement | undefined = undefined
  export let textFormatCategories: TextFormatCategory[] = [
    TextFormatCategory.Heading,
    TextFormatCategory.TextDecoration,
    TextFormatCategory.Link,
    TextFormatCategory.List,
    TextFormatCategory.Quote,
    TextFormatCategory.Code,
    TextFormatCategory.Table
  ]

  let textEditor: TextEditor

  let contentHeight: number

  export function submit (): void {
    textEditor.submit()
  }
  export function focus (): void {
    textEditor.focus()
  }
  export function isEditable (): boolean {
    return textEditor.isEditable()
  }
  export function setEditable (editable: boolean): void {
    textEditor.setEditable(editable)
  }
  export function getContent (): string {
    return content
  }
  export function setContent (data: string): void {
    textEditor.setContent(data)
  }
  export function insertText (text: string): void {
    textEditor.insertText(text)
  }

  $: varsStyle =
    maxHeight === 'card'
      ? 'calc(70vh - 12.5rem)'
      : maxHeight === 'limited'
        ? '12.5rem'
        : maxHeight === 'max'
          ? 'max-content'
          : maxHeight

  interface RefAction {
    label: IntlString
    icon: Asset | AnySvelteComponent
    action: RefInputAction
    order: number
    hidden?: boolean
  }
  const defActions: RefAction[] = [
    {
      label: textEditorPlugin.string.Attach,
      icon: Attach,
      action: () => {
        dispatch('attach')
      },
      order: 1001
    },
    {
      label: textEditorPlugin.string.Emoji,
      icon: IconEmoji,
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
      order: 4001
    }
  ]

  const client = getClient()
  let actions: RefAction[] = []
  client.findAll<RefInputActionItem>(textEditorPlugin.class.RefInputActionItem, {}).then(async (res) => {
    const cont: RefAction[] = []
    for (const r of res) {
      cont.push({
        label: r.label,
        icon: r.icon,
        order: r.order ?? 10000,
        action: await getResource(r.action)
      })
    }
    actions = defActions.concat(...cont).sort((a, b) => a.order - b.order)
  })

  const mergedEditorAttributes = mergeAttributes(
    editorAttributes,
    full ? { class: 'text-editor-view_full-height' } : { class: 'text-editor-view_compact' }
  )

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      textEditor.insertText(text)
    },
    insertTemplate: (name, text) => {
      textEditor.insertText(text)
      dispatch('template', name)
    }
  }
  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  let needFocus = autofocus
  const focused = false

  $: if (textEditor && needFocus) {
    if (!focused) textEditor.focus()
    needFocus = false
  }

  const buttonsGap = 'small-gap'

  $: buttonsHeight =
    buttonSize === 'large' || buttonSize === 'x-large'
      ? 'h-6 max-h-6'
      : buttonSize === 'medium'
        ? 'h-5 max-h-5'
        : 'h-4 max-h-4'

  /**
   * @public
   */
  export function removeNode (nde: ProseMirrorNode): void {
    textEditor.removeNode(nde)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="ref-container clear-mins"
  class:h-full={full}
  class:focusable
  tabindex="-1"
  on:click|preventDefault|stopPropagation={() => (needFocus = true)}
>
  <div class="textInput">
    <div
      bind:clientHeight={contentHeight}
      class="inputMsg"
      class:showScroll={contentHeight > 32}
      class:scrollable={isScrollable}
      style="--texteditor-maxheight: {varsStyle};"
    >
      {#if isScrollable}
        <Scroller>
          <TextEditor
            editorAttributes={mergedEditorAttributes}
            bind:content
            {placeholder}
            {extensions}
            {textFormatCategories}
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
          editorAttributes={mergedEditorAttributes}
          bind:content
          {placeholder}
          {extensions}
          {textFormatCategories}
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
          {boundary}
        />
      {/if}
    </div>
  </div>
  {#if showButtons}
    <div class="flex-between">
      <div class="buttons-group {buttonsGap} mt-3">
        {#each actions.filter((it) => it.hidden !== true) as a}
          <Button
            icon={a.icon}
            iconProps={{ size: buttonSize }}
            kind="ghost"
            showTooltip={{ label: a.label }}
            size={buttonSize}
            on:click={(evt) => handleAction(a, evt)}
          />
          {#if a.order % 10 === 1}
            <div class="buttons-divider {buttonsHeight}" />
          {/if}
        {/each}
        <slot />
      </div>
      {#if $$slots.right}
        <div class="buttons-group {buttonsGap} mt-3">
          <slot name="right" />
        </div>
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .ref-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;

    .textInput {
      flex-grow: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      min-height: 1.25rem;
      background-color: transparent;

      .inputMsg {
        align-self: stretch;
        width: 100%;
        min-height: 0;
        background-color: transparent;

        &.scrollable {
          max-height: var(--texteditor-maxheight);

          &.showScroll {
            overflow: auto;
          }
        }
        &:not(.showScroll) {
          overflow-y: hidden;

          &::-webkit-scrollbar-thumb {
            background-color: transparent;
          }
        }
      }
    }

    &.focusable {
      border: 0.0625rem solid transparent;
      border-radius: 0.375rem;
      margin: -0.25rem -0.5rem;
      padding: 0.25rem 0.5rem;

      &:focus-within {
        border-color: var(--primary-edit-border-color);
      }
    }
  }
</style>
