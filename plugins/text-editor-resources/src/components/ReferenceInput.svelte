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
  import { Asset, IntlString } from '@hcengineering/platform'
  import { EmptyMarkup, isEmptyMarkup } from '@hcengineering/text'
  import textEditor, { RefAction, TextEditorHandler } from '@hcengineering/text-editor'
  import {
    AnySvelteComponent,
    Button,
    ButtonKind,
    checkAdaptiveMatching,
    deviceOptionsStore as deviceInfo,
    handler,
    IconClose,
    registerFocus
  } from '@hcengineering/ui'
  import { FocusPosition } from '@tiptap/core'
  import { EditorView } from '@tiptap/pm/view'
  import { createEventDispatcher } from 'svelte'

  import view from '@hcengineering/view'
  import TextEditor from './TextEditor.svelte'
  import { defaultRefActions, getModelRefActions } from './editor/actions'
  import { EmojiExtension } from './extension/emoji'
  import { IsEmptyContentExtension } from './extension/isEmptyContent'
  import { referenceConfig, ReferenceExtension } from './extension/reference'
  import Send from './icons/Send.svelte'

  export let content: Markup = EmptyMarkup
  export let showHeader = false
  export let showActions = true
  export let showSend = true
  export let showCancel = false
  export let iconSend: Asset | AnySvelteComponent | undefined = undefined
  export let labelSend: IntlString | undefined = undefined
  export let labelCancel: IntlString | undefined = undefined
  export let kindSend: ButtonKind = 'ghost'
  export let kindCancel: ButtonKind = 'ghost'
  export let haveAttachment = false
  export let placeholder: IntlString | undefined = undefined
  export let extraActions: RefAction[] = []
  export let loading: boolean = false
  export let focusable: boolean = false
  export let noborder: boolean = false
  export let boundary: HTMLElement | undefined = undefined
  export let autofocus: FocusPosition = false
  export let canEmbedFiles = true
  export let canEmbedImages = true
  export let onPaste: ((view: EditorView, event: ClipboardEvent) => boolean) | undefined = undefined
  export let onCancel: (() => void) | undefined = undefined

  const dispatch = createEventDispatcher()
  const buttonSize = 'medium'

  let editor: TextEditor | undefined = undefined

  let isEmpty = true

  $: setContent(content)
  $: devSize = $deviceInfo.size
  $: shrinkButtons = checkAdaptiveMatching(devSize, 'sm')

  $: isEmptyContent = isEmpty || isEmptyMarkup(content)
  $: canSubmit = (haveAttachment || !isEmptyContent) && !loading

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

  let actions: RefAction[] = defaultRefActions.concat(...extraActions).sort((a, b) => a.order - b.order)

  void getModelRefActions().then((modelActions) => {
    actions = actions.concat(...modelActions).sort((a, b) => a.order - b.order)
  })

  export function submit (): void {
    editor?.submit()
  }

  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
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

<div class="ref-container" class:focusable class:noborder>
  {#if showHeader && $$slots.header}
    <div class="header">
      <slot name="header" />
    </div>
  {/if}
  <div class="text-input">
    <TextEditor
      bind:content
      bind:this={editor}
      {autofocus}
      {boundary}
      {canEmbedFiles}
      {canEmbedImages}
      on:content={(ev) => {
        if (canSubmit) {
          dispatch('message', ev.detail)
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
      {onPaste}
      on:update
      placeholder={placeholder ?? textEditor.string.EditorPlaceholder}
    />
  </div>
  {#if showActions || showSend}
    <div class="buttons-panel flex-between clear-mins">
      <div class="buttons-group {shrinkButtons ? 'xxsmall-gap' : 'xsmall-gap'}">
        {#if showActions}
          {#each actions as a}
            <Button
              disabled={a.disabled}
              icon={a.icon}
              iconProps={{ size: buttonSize }}
              kind="ghost"
              showTooltip={{ label: a.label }}
              size={buttonSize}
              on:click={handler(a, (a, evt) => {
                if (a.disabled !== true) {
                  handleAction(a, evt)
                }
              })}
            />
            {#if a.order % 10 === 1}
              <div class="buttons-divider" />
            {/if}
          {/each}
        {/if}
      </div>

      {#if showCancel && showSend}
        <div class="buttons-group {shrinkButtons ? 'xxsmall-gap' : 'xsmall-gap'}">
          <Button
            {loading}
            icon={IconClose}
            iconProps={{ size: buttonSize }}
            kind={kindCancel}
            size={buttonSize}
            showTooltip={{
              label: labelCancel ?? view.string.Cancel
            }}
            on:click={onCancel}
          />
          <Button
            {loading}
            disabled={!canSubmit}
            icon={iconSend ?? Send}
            iconProps={{ size: buttonSize }}
            kind={kindSend}
            size={buttonSize}
            showTooltip={{
              label: labelSend ?? textEditor.string.Send
            }}
            on:click={submit}
          />
        </div>
      {/if}
      {#if showSend && !showCancel}
        <Button
          {loading}
          disabled={!canSubmit}
          icon={iconSend ?? Send}
          iconProps={{ size: buttonSize }}
          kind={kindSend}
          size={buttonSize}
          showTooltip={{
            label: labelSend ?? textEditor.string.Send
          }}
          on:click={submit}
        />
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .ref-container {
    display: flex;
    flex-direction: column;
    min-height: 2.5rem;
    border: 0.0625rem solid var(--theme-refinput-border);
    border-radius: 0.375rem;

    &.focusable {
      &:focus-within {
        border-color: var(--primary-edit-border-color);
      }
    }

    &.noborder {
      border: none;
    }
  }

  .header {
    padding: 0.325rem 0.75rem;
    border-bottom: 0.0625rem solid var(--theme-refinput-border);
  }

  .text-input {
    overflow: auto;
    min-height: 2.75rem;
    padding: 0.125rem 0.75rem;
  }

  .buttons-panel {
    flex-shrink: 0;
    padding: 0.325rem 0.75rem;
  }
</style>
