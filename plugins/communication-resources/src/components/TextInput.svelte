<!-- Copyright © 2025 Hardcore Engineering Inc. -->
<!-- -->
<!-- Licensed under the Eclipse Public License, Version 2.0 (the "License"); -->
<!-- you may not use this file except in compliance with the License. You may -->
<!-- obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0 -->
<!-- -->
<!-- Unless required by applicable law or agreed to in writing, software -->
<!-- distributed under the License is distributed on an "AS IS" BASIS, -->
<!-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. -->
<!-- -->
<!-- See the License for the specific language governing permissions and -->
<!-- limitations under the License. -->
<script lang="ts">
  import { Markup, type Blob, type Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { areEqualMarkups, EmptyMarkup, isEmptyMarkup } from '@hcengineering/text'
  import { TextEditorHandler } from '@hcengineering/text-editor'
  import { TextEditor } from '@hcengineering/text-editor-resources'
  import { Button, ButtonIcon, handler, IconComponent, IconSend, registerFocus } from '@hcengineering/ui'
  import { FocusPosition } from '@tiptap/core'
  import { EditorView } from '@tiptap/pm/view'
  import { createEventDispatcher } from 'svelte'

  import communication from '../plugin'
  import { TextInputAction } from '../types'

  export let content: Markup = EmptyMarkup
  export let hasChanges = false
  export let sendIcon: IconComponent | undefined = undefined
  export let sendLabel: IntlString | undefined = undefined
  export let placeholder: IntlString | undefined = undefined
  export let placeholderParams: Record<string, any> = {}

  export let actions: TextInputAction[] = []
  export let loading: boolean = false
  export let boundary: HTMLElement | undefined = undefined
  export let autofocus: FocusPosition = false
  export let onCancel: (() => void) | undefined = undefined
  export let onPaste: ((view: EditorView, event: ClipboardEvent) => boolean) | undefined = undefined

  const dispatch = createEventDispatcher()

  const _initialContent: Markup = content

  let editor: TextEditor | undefined = undefined

  let isEmpty = true

  $: setContent(content)

  function canSubmit (loading: boolean, content: Markup, hasChanges: boolean): boolean {
    if (loading) return false

    const isEmptyContent = isEmpty || isEmptyMarkup(content)

    if (isEmptyContent && !hasChanges) return false

    const isContentChanged = !areEqualMarkups(content, _initialContent)
    return isContentChanged || hasChanges
  }

  function setContent (content: Markup): void {
    editor?.setContent(content)
  }

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      editor?.insertText(text)
    },
    insertEmoji: (text: string, image?: Ref<Blob>) => {
      editor?.insertEmoji(text, image)
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
</script>

<div class="text-input">
  {#if $$slots.header}
    <div class="text-input__header">
      <slot name="header" />
    </div>
  {/if}
  <div class="text-input__text">
    <TextEditor
      bind:content
      bind:this={editor}
      {autofocus}
      {boundary}
      {placeholder}
      {placeholderParams}
      {onPaste}
      on:content={(ev) => {
        if (canSubmit(loading, content, hasChanges)) {
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
      kitOptions={{
        dropcursor: false,
        file: false,
        image: false,
        emoji: true,
        reference: true,
        hooks: {
          emptyContent: {
            onChange: (a) => (isEmpty = a)
          }
        }
      }}
      on:update
    />
  </div>
  <div class="text_input__footer">
    <div class="text_input__actions">
      {#each sortedActions as action}
        <ButtonIcon
          disabled={action.disabled}
          icon={action.icon}
          iconSize="small"
          size="small"
          kind="tertiary"
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
          label={communication.string.Cancel}
          kind="ghost"
          showTooltip={{ label: communication.string.Cancel }}
          on:click={onCancel}
        />
      {/if}
      <ButtonIcon
        disabled={loading || !canSubmit(loading, content, hasChanges)}
        icon={sendIcon ?? IconSend}
        iconSize="small"
        size="small"
        kind="tertiary"
        tooltip={{ label: sendLabel ?? communication.string.Send }}
        on:click={submit}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .text-input {
    display: flex;
    padding: 0.75rem;
    padding-top: 0.5rem;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
    align-self: stretch;
    border-radius: 0.75rem;
    border: 1px solid var(--theme-refinput-divider);
    overflow: hidden;
  }

  .text-input__text {
    overflow: auto;
    min-height: 2.85rem;
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
    min-width: 0;
  }

  .text-input__header {
    display: flex;
    width: 100%;
    min-width: 0;
  }

  .text_input__actions {
    display: flex;
    gap: 0.375rem;
  }
</style>
