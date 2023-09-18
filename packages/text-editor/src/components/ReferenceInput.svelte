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
  import { Asset, IntlString, getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import {
    AnySvelteComponent,
    EmojiPopup,
    Icon,
    IconEmoji,
    Spinner,
    handler,
    registerFocus,
    showPopup,
    tooltip,
    deviceOptionsStore as deviceInfo,
    checkAdaptiveMatching
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import { RefAction, RefInputActionItem, TextEditorHandler, TextFormatCategory } from '../types'
  import TextEditor from './TextEditor.svelte'
  import { completionConfig } from './extensions'
  import Attach from './icons/Attach.svelte'
  import RIMention from './icons/RIMention.svelte'
  import Send from './icons/Send.svelte'

  const dispatch = createEventDispatcher()
  export let content: string = ''
  export let showSend = true
  export let iconSend: Asset | AnySvelteComponent | undefined = undefined
  export let labelSend: IntlString | undefined = undefined
  export let haveAttachment = false
  export let withoutTopBorder = false
  export let placeholder: IntlString | undefined = undefined
  export let extraActions: RefAction[] | undefined = undefined
  export let loading: boolean = false
  export let basicInput: boolean = false

  const client = getClient()

  let textEditor: TextEditor

  let isEmpty = true

  $: setContent(content)
  $: devSize = $deviceInfo.size
  $: shrinkButtons = checkAdaptiveMatching(devSize, 'sm')

  function setContent (content: string) {
    textEditor?.setContent(content)
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
      label: textEditorPlugin.string.Mention,
      icon: RIMention,
      action: () => textEditor.insertText('@'),
      order: 3000
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
  $: actionsToShow = basicInput ? [defActions[0]] : actions

  export function submit (): void {
    textEditor.submit()
  }

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      textEditor.insertText(text)
    },
    insertTemplate: (name, text) => {
      textEditor.insertText(text)
    }
  }
  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

  // Focusable control with index
  let focused = false
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      const editable = textEditor?.isEditable()
      if (editable) {
        focused = true
        textEditor.focus()
      }
      return editable
    },
    isFocus: () => focused
  })
  const updateFocus = () => {
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

<div class="ref-container">
  <div class="textInput" class:withoutTopBorder>
    <div class="inputMsg">
      <TextEditor
        bind:content
        bind:isEmpty
        bind:this={textEditor}
        on:content={(ev) => {
          if (!isEmpty || haveAttachment) {
            dispatch('message', ev.detail)
            content = ''
            textEditor.clear()
          }
        }}
        on:blur={() => {
          focused = false
          dispatch('blur', focused)
        }}
        on:focus={() => {
          focused = true
          updateFocus()
          dispatch('focus', focused)
        }}
        extensions={[completionPlugin]}
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
    {#if showSend}
      <button
        class="sendButton"
        on:click={submit}
        use:tooltip={{ label: labelSend ?? textEditorPlugin.string.Send }}
        disabled={(isEmpty && !haveAttachment) || loading}
      >
        <div class="icon">
          {#if loading}
            <div class="pointer-events-none spinner">
              <Spinner size={'medium'} />
            </div>
          {:else}
            <Icon icon={iconSend ?? Send} size={'medium'} />
          {/if}
        </div>
      </button>
    {/if}
  </div>
  <div class="flex-between clear-mins" style:margin={'.75rem .75rem 0'}>
    <div class="buttons-group medium-gap">
      {#each actionsToShow as a}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="icon-button"
          use:tooltip={{ label: a.label }}
          on:click={handler(a, (a, evt) => handleAction(a, evt))}
        >
          <Icon icon={a.icon} size={'medium'} />
        </div>
        {#if a.order % 10 === 1}
          <div class="buttons-divider" />
        {/if}
      {/each}
    </div>
    {#if extraActions && extraActions.length > 0 && !basicInput}
      <div class="buttons-group {shrinkButtons ? 'medium-gap' : 'large-gap'}">
        {#each extraActions as a}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="icon-button"
            class:disabled={a.disabled}
            use:tooltip={{ label: a.label }}
            on:click={handler(a, (a, evt) => {
              if (!a.disabled) {
                handleAction(a, evt)
              }
            })}
          >
            <Icon icon={a.icon} size={'medium'} fill={a.fill} />
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  .icon-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 1.25rem;
    height: 1.25rem;
    color: var(--theme-darker-color);
    cursor: pointer;

    &:hover {
      color: var(--theme-content-color);
    }
    &.disabled {
      color: var(--theme-trans-color);
      &:hover {
        color: var(--theme-trans-color);
        cursor: not-allowed;
      }
    }
  }
  .ref-container {
    display: flex;
    flex-direction: column;
    min-height: 4.5rem;

    .textInput {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      min-height: 2.75rem;
      padding: 0.75rem 1rem;
      background-color: var(--theme-refinput-color);
      border: 1px solid var(--theme-refinput-border);
      border-radius: 0.25rem;

      &.withoutTopBorder {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
      }

      .inputMsg {
        display: flex;
        align-self: center;
        align-items: center;
        width: calc(100% - 1.75rem);
        height: 100%;
        color: var(--theme-content-color);
        background-color: transparent;
        border: none;
        outline: none;
      }
      .sendButton {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
        margin-left: 0.5rem;
        padding: 0;
        width: 1.25rem;
        height: 1.25rem;
        background-color: transparent;
        border: 1px solid transparent;
        border-radius: 0.25rem;
        outline: none;
        cursor: pointer;

        .icon {
          width: 1.25rem;
          height: 1.25rem;
          color: var(--theme-content-color);
          cursor: pointer;

          &:hover {
            color: var(--theme-caption-color);
          }
        }
        &:focus {
          box-shadow: 0 0 0 2px var(--accented-button-outline);

          & > .icon {
            color: var(--theme-caption-color);
          }
        }

        &:disabled {
          pointer-events: none;

          .icon {
            color: var(--theme-trans-color);
            cursor: not-allowed;
          }
        }
      }
    }
  }
</style>
