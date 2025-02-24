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
  import { Markup } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { EmptyMarkup } from '@hcengineering/text'
  import { Button, type ButtonSize, Scroller } from '@hcengineering/ui'
  import { AnyExtension, mergeAttributes, type Editor } from '@tiptap/core'
  import { createEventDispatcher } from 'svelte'
  import textEditor, { RefAction, TextEditorHandler, TextFormatCategory } from '@hcengineering/text-editor'
  import { defaultRefActions, getModelRefActions } from './editor/actions'
  import TextEditor from './TextEditor.svelte'

  const dispatch = createEventDispatcher()

  export let content: Markup = EmptyMarkup
  export let placeholder: IntlString = textEditor.string.EditorPlaceholder
  export let showButtons: boolean = true
  export let buttonSize: ButtonSize = 'medium'
  export let isScrollable: boolean = true
  export let focusable: boolean = false
  export let maxHeight: 'max' | 'card' | 'limited' | string | undefined = undefined
  export let autofocus = false
  export let full = false
  export let extensions: AnyExtension[] = []
  export let editorAttributes: Record<string, string> = {}
  export let extraActions: RefAction[] = []
  export let boundary: HTMLElement | undefined = undefined

  let editor: TextEditor | undefined = undefined

  export function submit (): void {
    editor?.submit()
  }
  export function focus (): void {
    editor?.focus()
  }
  export function isEditable (): boolean {
    return editor?.isEditable() ?? false
  }
  export function setEditable (editable: boolean): void {
    editor?.setEditable(editable)
  }
  export function getContent (): Markup {
    return content
  }
  export function setContent (data: Markup): void {
    editor?.setContent(data)
  }
  export function insertText (text: string): void {
    editor?.insertText(text)
  }
  export function getEditor (): Editor | undefined {
    return editor?.getEditor()
  }

  $: varsStyle =
    maxHeight === 'card'
      ? 'calc(70vh - 12.5rem)'
      : maxHeight === 'limited'
        ? '12.5rem'
        : maxHeight === 'max'
          ? 'max-content'
          : maxHeight

  export const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      editor?.insertText(text)
    },
    insertMarkup: (markup) => {
      editor?.insertMarkup(markup)
    },
    insertTemplate: (name, markup) => {
      editor?.insertMarkup(markup)
      dispatch('template', name)
    },
    insertTable (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) {
      editor?.insertTable(options)
    },
    insertCodeBlock: (pos?: number) => {
      editor?.insertCodeBlock(pos)
    },
    insertSeparatorLine: () => {
      editor?.insertSeparatorLine()
    },
    insertContent: (value, options) => {
      editor?.insertContent(value, options)
    },
    focus: () => {
      editor?.focus()
    }
  }

  let actions: RefAction[] = defaultRefActions.concat(...extraActions).sort((a, b) => a.order - b.order)

  void getModelRefActions().then((modelActions) => {
    actions = actions.concat(...modelActions).sort((a, b) => a.order - b.order)
  })

  const mergedEditorAttributes = mergeAttributes(
    editorAttributes,
    full ? { class: 'text-editor-view_full-height' } : { class: 'text-editor-view_compact' }
  )

  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  let needFocus = autofocus
  const focused = false

  $: if (editor !== undefined && needFocus) {
    if (!focused) editor.focus()
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
  export function removeAttachment (id: string): void {
    editor?.removeAttachment(id)
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
  class="ref-container clear-mins"
  class:h-full={full}
  class:focusable
  tabindex="-1"
  on:click|preventDefault|stopPropagation={() => (needFocus = true)}
>
  <div class="textInput">
    <div class="inputMsg" class:scrollable={isScrollable} style:--texteditor-maxheight={varsStyle}>
      {#if isScrollable}
        <Scroller>
          <TextEditor
            editorAttributes={mergedEditorAttributes}
            bind:content
            {placeholder}
            {extensions}
            bind:this={editor}
            on:value
            on:content={(ev) => {
              dispatch('message', ev.detail)
              content = EmptyMarkup
              editor?.clear()
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
          bind:this={editor}
          on:value
          on:content={(ev) => {
            dispatch('message', ev.detail)
            content = EmptyMarkup
            editor?.clear()
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
        {#each actions as a}
          <Button
            icon={a.icon}
            iconProps={{ size: buttonSize }}
            kind="ghost"
            showTooltip={{ label: a.label }}
            size={buttonSize}
            on:click={(evt) => {
              handleAction(a, evt)
            }}
          />
          {#if a.order % 10 === 1}
            <div class="buttons-divider {buttonsHeight}" />
          {/if}
        {/each}
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
      margin: -0.25rem -1.25rem;
      padding: 0.25rem 1.25rem;
    }
  }
</style>
