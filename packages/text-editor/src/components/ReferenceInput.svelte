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
  import { Asset, IntlString } from '@hcengineering/platform'
  import {
    AnySvelteComponent,
    Button,
    ButtonKind,
    handler,
    registerFocus,
    deviceOptionsStore as deviceInfo,
    checkAdaptiveMatching
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import { RefAction, TextEditorHandler, TextFormatCategory } from '../types'
  import TextEditor from './TextEditor.svelte'
  import { defaultRefActions, getModelRefActions } from './editor/actions'
  import { completionConfig } from './extensions'
  import { EmojiExtension } from './extension/emoji'
  import { IsEmptyContentExtension } from './extension/isEmptyContent'
  import Send from './icons/Send.svelte'

  export let content: string = ''
  export let showHeader = false
  export let showActions = true
  export let showSend = true
  export let iconSend: Asset | AnySvelteComponent | undefined = undefined
  export let labelSend: IntlString | undefined = undefined
  export let kindSend: ButtonKind = 'ghost'
  export let haveAttachment = false
  export let placeholder: IntlString | undefined = undefined
  export let extraActions: RefAction[] = []
  export let loading: boolean = false
  export let focusable: boolean = false
  export let boundary: HTMLElement | undefined = undefined

  const dispatch = createEventDispatcher()
  const buttonSize = 'medium'

  let textEditor: TextEditor | undefined = undefined

  let isEmpty = true

  $: setContent(content)
  $: devSize = $deviceInfo.size
  $: shrinkButtons = checkAdaptiveMatching(devSize, 'sm')

  function setContent (content: string): void {
    textEditor?.setContent(content)
  }

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      textEditor?.insertText(text)
    },
    insertTemplate: (name, text) => {
      textEditor?.insertText(text)
    },
    focus: () => {
      textEditor?.focus()
    }
  }

  let actions: RefAction[] = defaultRefActions.concat(...extraActions).sort((a, b) => a.order - b.order)

  void getModelRefActions().then((modelActions) => {
    actions = actions.concat(...modelActions).sort((a, b) => a.order - b.order)
  })

  export function submit (): void {
    textEditor?.submit()
  }

  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  // Focusable control with index
  let focused = false
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      const editable: boolean = textEditor?.isEditable() ?? false
      if (editable) {
        focused = true
        textEditor?.focus()
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
  const completionPlugin = Completion.configure({
    ...completionConfig,
    showDoc (event: MouseEvent, _id: string, _class: string) {
      dispatch('open-document', { event, _id, _class })
    }
  })
</script>

<div class="ref-container" class:focusable>
  {#if showHeader && $$slots.header}
    <div class="header">
      <slot name="header" />
    </div>
  {/if}
  <div class="text-input">
    <TextEditor
      bind:content
      bind:this={textEditor}
      {boundary}
      on:content={(ev) => {
        if (!isEmpty || haveAttachment) {
          dispatch('message', ev.detail)
          content = ''
          textEditor?.clear()
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
      placeholder={placeholder ?? textEditorPlugin.string.EditorPlaceholder}
      textFormatCategories={[
        TextFormatCategory.TextDecoration,
        TextFormatCategory.Link,
        TextFormatCategory.List,
        TextFormatCategory.Quote,
        TextFormatCategory.Code
      ]}
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

      {#if showSend}
        <Button
          {loading}
          disabled={(isEmpty && !haveAttachment) || loading}
          icon={iconSend ?? Send}
          iconProps={{ size: buttonSize }}
          kind={kindSend}
          size={buttonSize}
          showTooltip={{
            label: labelSend ?? textEditorPlugin.string.Send
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
  }

  .header {
    padding: 0.325rem 0.75rem;
    border-bottom: 0.0625rem solid var(--theme-refinput-border);
  }

  .text-input {
    min-height: 2.75rem;
    padding: 0.125rem 0.75rem;
  }

  .buttons-panel {
    padding: 0.325rem 0.75rem;
  }
</style>
