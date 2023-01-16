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
  import { getResource, IntlString, Asset } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Button, Icon, showPopup, tooltip } from '@hcengineering/ui'
  import type { AnySvelteComponent } from '@hcengineering/ui'
  import { AnyExtension } from '@tiptap/core'
  import { createEventDispatcher } from 'svelte'
  import { Completion } from '../Completion'
  import textEditorPlugin from '../plugin'
  import { FormatMode, FORMAT_MODES, RefAction, RefInputActionItem, TextEditorHandler } from '../types'
  import EmojiPopup from './EmojiPopup.svelte'
  import Attach from './icons/Attach.svelte'
  import Bold from './icons/Bold.svelte'
  import Code from './icons/Code.svelte'
  import CodeBlock from './icons/CodeBlock.svelte'
  import Emoji from './icons/Emoji.svelte'
  import GIF from './icons/GIF.svelte'
  import Italic from './icons/Italic.svelte'
  import Link from './icons/Link.svelte'
  import ListBullet from './icons/ListBullet.svelte'
  import ListNumber from './icons/ListNumber.svelte'
  import Quote from './icons/Quote.svelte'
  import Send from './icons/Send.svelte'
  import Strikethrough from './icons/Strikethrough.svelte'
  import TextStyle from './icons/TextStyle.svelte'
  import LinkPopup from './LinkPopup.svelte'
  import MentionList from './MentionList.svelte'
  import { SvelteRenderer } from './SvelteRenderer'
  import TextEditor from './TextEditor.svelte'

  const dispatch = createEventDispatcher()
  export let content: string = ''
  export let showSend = true
  export let iconSend: Asset | AnySvelteComponent | undefined = undefined
  export let labelSend: IntlString | undefined = undefined
  export let haveAttachment = false
  export let withoutTopBorder = false
  export let placeholder: IntlString | undefined = undefined
  export let extraActions: RefAction[] | undefined = undefined
  const client = getClient()

  let textEditor: TextEditor
  let isFormatting = false
  let activeModes = new Set<FormatMode>()
  let isSelectionEmpty = true
  let isEmpty = true

  $: setContent(content)

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
      order: 1000
    },
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
          },
          () => {}
        )
      },
      order: 3000
    },
    {
      label: textEditorPlugin.string.GIF,
      icon: GIF,
      action: () => {},
      order: 4000
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

  export function submit (): void {
    textEditor.submit()
  }

  const editorExtensions: AnyExtension[] = [
    Completion.configure({
      HTMLAttributes: {
        class: 'reference'
      },
      suggestion: {
        items: async (query: { query: string }) => {
          return []
        },
        render: () => {
          let component: any

          return {
            onStart: (props: any) => {
              component = new SvelteRenderer(MentionList, {
                ...props,
                close: () => {
                  component.destroy()
                }
              })
            },
            onUpdate (props: any) {
              component.updateProps(props)
            },
            onKeyDown (props: any) {
              return component.onKeyDown(props)
            },
            onExit () {
              component.destroy()
            }
          }
        }
      }
    })
  ]

  const editorHandler: TextEditorHandler = {
    insertText: (text) => {
      textEditor.insertText(text)
    }
  }
  function handleAction (a: RefAction, evt?: Event): void {
    a.action(evt?.target as HTMLElement, editorHandler)
  }

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
</script>

<div class="ref-container">
  {#if isFormatting}
    <div class="formatPanelRef buttons-group xsmall-gap" class:withoutTopBorder>
      <Button
        icon={Bold}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('bold')}
        showTooltip={{ label: textEditorPlugin.string.Bold }}
        on:click={getToggler(textEditor.toggleBold)}
      />
      <Button
        icon={Italic}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('italic')}
        showTooltip={{ label: textEditorPlugin.string.Italic }}
        on:click={getToggler(textEditor.toggleItalic)}
      />
      <Button
        icon={Strikethrough}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('strike')}
        showTooltip={{ label: textEditorPlugin.string.Strikethrough }}
        on:click={getToggler(textEditor.toggleStrike)}
      />
      <Button
        icon={Link}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('link')}
        disabled={isSelectionEmpty && !activeModes.has('link')}
        showTooltip={{ label: textEditorPlugin.string.Link }}
        on:click={formatLink}
      />
      <div class="buttons-divider" />
      <Button
        icon={ListNumber}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('orderedList')}
        showTooltip={{ label: textEditorPlugin.string.OrderedList }}
        on:click={getToggler(textEditor.toggleOrderedList)}
      />
      <Button
        icon={ListBullet}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('bulletList')}
        showTooltip={{ label: textEditorPlugin.string.BulletedList }}
        on:click={getToggler(textEditor.toggleBulletList)}
      />
      <div class="buttons-divider" />
      <Button
        icon={Quote}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('blockquote')}
        showTooltip={{ label: textEditorPlugin.string.Blockquote }}
        on:click={getToggler(textEditor.toggleBlockquote)}
      />
      <div class="buttons-divider" />
      <Button
        icon={Code}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('code')}
        showTooltip={{ label: textEditorPlugin.string.Code }}
        on:click={getToggler(textEditor.toggleCode)}
      />
      <Button
        icon={CodeBlock}
        kind={'transparent'}
        size={'small'}
        selected={activeModes.has('codeBlock')}
        showTooltip={{ label: textEditorPlugin.string.CodeBlock }}
        on:click={getToggler(textEditor.toggleCodeBlock)}
      />
    </div>
  {/if}
  <div class="textInput" class:withoutTopBorder={withoutTopBorder || isFormatting}>
    <div class="inputMsg">
      <TextEditor
        bind:content
        bind:isEmpty
        bind:this={textEditor}
        on:content={(ev) => {
          dispatch('message', ev.detail)
          content = ''
          textEditor.clear()
        }}
        extensions={editorExtensions}
        on:selection-update={updateFormattingState}
        on:update
        placeholder={placeholder ?? textEditorPlugin.string.EditorPlaceholder}
      />
    </div>
    {#if showSend}
      <button
        class="sendButton"
        on:click={submit}
        use:tooltip={{ label: labelSend ?? textEditorPlugin.string.Send }}
        disabled={isEmpty && !haveAttachment}
      >
        <div class="icon"><Icon icon={iconSend ?? Send} size={'medium'} /></div>
      </button>
    {/if}
  </div>
  <div class="flex-between clear-mins" style:margin={'.5rem 1rem 0'}>
    <div class="buttons-group large-gap">
      {#each actions as a}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="icon-button" use:tooltip={{ label: a.label }} on:click={(evt) => handleAction(a, evt)}>
          <Icon icon={a.icon} size={'medium'} fill={a.fill} />
        </div>
      {/each}
    </div>
    {#if extraActions && extraActions.length > 0}
      <div class="buttons-group large-gap">
        {#each extraActions as a}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            class="icon-button"
            class:disabled={a.disabled}
            use:tooltip={{ label: a.label }}
            on:click={(evt) => {
              if (!a.disabled) {
                handleAction(a, evt)
              }
            }}
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
    width: 1rem;
    height: 1rem;
    color: var(--caption-color);
    opacity: 0.6;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
    &.disabled {
      opacity: 0.3;
      &:hover {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }
  }
  .ref-container {
    display: flex;
    flex-direction: column;
    min-height: 4.5rem;

    .formatPanelRef {
      padding: 0.5rem;
      background-color: var(--body-accent);
      border: 1px solid var(--divider-color);
      border-radius: 0.5rem 0.5rem 0 0;
      border-bottom: 0;

      &.withoutTopBorder {
        border-radius: 0;
      }
      & + .textInput {
        border-top: none;
      }
    }

    .textInput {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      min-height: 2.75rem;
      padding: 0.75rem 1rem;
      background-color: var(--accent-bg-color);
      border: 1px solid var(--divider-color);
      border-radius: 0.5rem;

      &.withoutTopBorder {
        border-top-left-radius: 0;
        border-top-right-radius: 0;
      }

      .inputMsg {
        display: flex;
        align-self: center;
        align-items: center;
        width: 100%;
        height: 100%;
        color: var(--theme-content-color);
        background-color: transparent;
        border: none;
        outline: none;
        // &.thread {
        //   width: auto;
        // }

        // .flex-column {
        //   display: flex;
        //   flex-direction: column;
        //   align-items: center;
        // }

        // .flex-row {
        //   display: flex;
        //   flex-direction: row;
        //   align-items: flex-end;
        // }

        // .edit-box-horizontal {
        //   width: 100%;
        //   height: 100%;
        //   margin-top: 7px;
        //   align-self: center;
        // }

        // .edit-box-vertical {
        //   width: 100%;
        //   height: 100%;
        //   margin: 4px;
        // }
      }
      .sendButton {
        display: flex;
        justify-content: center;
        align-items: center;
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
          color: var(--theme-content-dark-color);
          cursor: pointer;

          &:hover {
            color: var(--theme-caption-color);
          }
        }
        &:focus {
          border: 1px solid var(--primary-button-focused-border);
          box-shadow: 0 0 0 3px var(--primary-button-outline);

          & > .icon {
            color: var(--theme-caption-color);
          }
        }

        &:disabled {
          pointer-events: none;

          .icon {
            opacity: 0.5;
            cursor: not-allowed;
          }
        }
      }
    }
  }
</style>
