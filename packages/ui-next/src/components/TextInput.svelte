<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { EmptyMarkup, isEmptyMarkup, areEqualMarkups } from '@hcengineering/text'
  import { TextEditorHandler } from '@hcengineering/text-editor'
  import { handler, registerFocus } from '@hcengineering/ui'
  import { FocusPosition } from '@tiptap/core'
  import { createEventDispatcher } from 'svelte'
  import {
    EmojiExtension,
    IsEmptyContentExtension,
    referenceConfig,
    ReferenceExtension,
    TextEditor
  } from '@hcengineering/text-editor-resources'

  import Button from './Button.svelte'
  import IconSend from './icons/IconSend.svelte'
  import uiNext from '../plugin'
  import { IconComponent, TextInputAction } from '../types'

  export let content: Markup = EmptyMarkup
  export let hasNonTextContent = false
  export let sendIcon: IconComponent | undefined = undefined
  export let sendLabel: IntlString | undefined = undefined
  export let placeholder: IntlString | undefined = undefined
  export let placeholderParams: Record<string, any> = {}

  export let actions: TextInputAction[] = []
  export let loading: boolean = false
  export let boundary: HTMLElement | undefined = undefined
  export let autofocus: FocusPosition = false
  export let onCancel: (() => void) | undefined = undefined

  const dispatch = createEventDispatcher()

  const _initialContent: Markup = content

  let editor: TextEditor | undefined = undefined

  let isEmpty = true

  $: setContent(content)

  function canSubmit (loading: boolean, content: Markup, hasNonTextContent: boolean): boolean {
    if (loading) return false

    const isEmptyContent = isEmpty || isEmptyMarkup(content)

    if (isEmptyContent && !hasNonTextContent) return false

    const isContentChanged = !areEqualMarkups(content, _initialContent)
    return isContentChanged || hasNonTextContent
  }

  function setContent (content: Markup): void {
    editor?.setContent(content)
  }

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      editor?.insertText(text)
    },
    insertMarkup: (markup) => {
      editor?.insertMarkup(markup)
    },
    insertTemplate: (name, markup) => {
      editor?.insertMarkup(markup)
    },
    insertTable (options: { rows?: number, cols?: number, withHeaderRow?: boolean }) {
      editor?.insertTable(options)
    },
    insertCodeBlock: () => {
      editor?.insertCodeBlock()
    },
    insertSeparatorLine: () => {
      editor?.insertSeparatorLine()
    },
    insertContent: (content) => {
      editor?.insertContent(content)
    },
    focus: () => {
      editor?.focus()
    }
  }

  let sortedActions: TextInputAction[] = []
  $: sortedActions = actions.sort((a, b) => a.order - b.order)

  export function submit (): void {
    editor?.submit()
  }

  function handleAction (action: TextInputAction, evt?: Event): void {
    action.action(evt?.target as HTMLElement, editorHandler)
  }

  // Focusable control with index
  let focused = false
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      const editable: boolean = editor?.isEditable() ?? false
      if (editable) {
        focused = true
        editor?.focus()
      }
      return editable
    },
    isFocus: () => focused
  })
  const updateFocus = (): void => {
    if (focusIndex !== -1) {
      focusManager?.setFocus(idx)
    }
  }
  const completionPlugin = ReferenceExtension.configure({
    ...referenceConfig,
    showDoc (event: MouseEvent, _id: string, _class: string) {
      dispatch('open-document', { event, _id, _class })
    }
  })
</script>

<div class="text-input">
  {#if $$slots.header}
    <slot name="header" />
  {/if}
  <div class="text-input__text">
    <TextEditor
      bind:content
      bind:this={editor}
      {autofocus}
      {boundary}
      canEmbedFiles={false}
      canEmbedImages={false}
      editorAttributes={{ class: 'next-text-editor-view' }}
      {placeholder}
      {placeholderParams}
      on:content={(ev) => {
        if (canSubmit(loading, content, hasNonTextContent)) {
          dispatch('submit', ev.detail)
          content = EmptyMarkup
          editor?.clear?.()
        }
      }}
      on:blur={() => {
        focused = false
        dispatch('blur')
      }}
      on:focus={() => {
        focused = true
        updateFocus()
        dispatch('focus')
      }}
      extensions={[
        completionPlugin,
        EmojiExtension.configure(),
        IsEmptyContentExtension.configure({ onChange: (value) => (isEmpty = value) })
      ]}
      on:update
    />
  </div>
  <div class="text_input__footer">
    <div class="text_input__actions">
      {#each sortedActions as action}
        <Button
          disabled={action.disabled}
          icon={action.icon}
          iconSize="small"
          tooltip={{ label: action.label }}
          on:click={handler(action, (a, evt) => {
            if (a.disabled !== true) {
              handleAction(a, evt)
            }
          })}
        />
      {/each}
    </div>
    <div class="text_input__actions">
      {#if onCancel !== undefined}
        <Button
          disabled={loading}
          labelIntl={uiNext.string.Cancel}
          tooltip={{ label: uiNext.string.Cancel }}
          on:click={onCancel}
        />
      {/if}
      <Button
        icon={sendIcon ?? IconSend}
        iconSize="small"
        disabled={loading ?? !canSubmit(loading, content, hasNonTextContent)}
        tooltip={{ label: sendLabel ?? uiNext.string.Send }}
        on:click={submit}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .text-input {
    display: flex;
    padding: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.375rem;
    align-self: stretch;
    border-radius: 0.75rem;
    border: 1px solid var(--next-message-input-color-stroke);
    background: var(--next-message-input-color-background);
    overflow: hidden;
  }

  .text-input__text {
    overflow: auto;
    min-height: 2.75rem;
    padding: 0 0.25rem;
    font-size: 0.875rem;
    font-weight: 400;
    width: 100%;
  }

  .text_input__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
  }

  .text_input__actions {
    display: flex;
    gap: 0.375rem;
  }
</style>
